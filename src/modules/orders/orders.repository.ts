import { and, asc, count, desc, eq, inArray, lte, lt, sql } from 'drizzle-orm'
import { db } from '../../database/client'
import { inventoryMovements, orderDetails, orders, payments, products, purchaseDetails } from '../../database/schema'
import { AppError } from '../../shared/errors/app-error'
import { getPagination, type PaginationInput } from '../../shared/http/pagination'

export const ordersRepository = {
  findAll: async (pagination: PaginationInput = {}) => {
    const { limit, offset } = getPagination(pagination)
    const [items, countRows] = await Promise.all([
      db.select().from(orders).orderBy(desc(orders.orderDate)).limit(limit).offset(offset),
      db.select({ total: count() }).from(orders),
    ])
    return { items, total: Number(countRows[0]?.total ?? 0) }
  },

  findById: async (id: string) => {
    const [order] = await db.select().from(orders).where(eq(orders.id, id))
    return order
  },

  findProductById: async (id: string) => {
    const [product] = await db.select().from(products).where(eq(products.id, id))
    return product
  },

  findAvailableLotsByProductId: (productId: string) =>
    db.select().from(purchaseDetails)
      .where(eq(purchaseDetails.productId, productId))
      .orderBy(asc(purchaseDetails.createdAt)),

  findDetailsByOrderId: (orderId: string) => db.select().from(orderDetails).where(eq(orderDetails.orderId, orderId)).orderBy(asc(orderDetails.createdAt)),

  findPaymentsByOrderId: (orderId: string) => db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(asc(payments.paymentDate)),

  create: async (data: typeof orders.$inferInsert) => {
    const [order] = await db.insert(orders).values(data).returning()
    return order
  },

  createDetail: async (data: typeof orderDetails.$inferInsert) => {
    const [detail] = await db.insert(orderDetails).values(data).returning()
    return detail
  },

  createPayment: async (data: typeof payments.$inferInsert) => {
    const [payment] = await db.insert(payments).values(data).returning()
    return payment
  },

  update: async (id: string, data: Partial<typeof orders.$inferInsert>) => {
    const [order] = await db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()
    return order
  },

  createTransactional: async (data: {
    order: typeof orders.$inferInsert
    details: Array<Omit<typeof orderDetails.$inferInsert, 'orderId'>>
    payment?: typeof payments.$inferInsert
    reserve: boolean
    createdBy: string
  }) => db.transaction(async (tx) => {
    const [order] = await tx.insert(orders).values(data.order).returning()
    if (!order) throw new Error('No se pudo registrar el pedido.')

    const createdDetails = [] as Array<typeof orderDetails.$inferSelect>
    for (const detailData of data.details) {
      if (data.reserve) {
        if (!detailData.purchaseDetailId) throw new Error('El apartado requiere un lote de inventario.')
        const [lot] = await tx.select().from(purchaseDetails).where(eq(purchaseDetails.id, detailData.purchaseDetailId)).for('update')
        if (!lot || lot.productId !== detailData.productId || lot.quantityRemaining < detailData.quantity) {
          throw new Error('Stock insuficiente para apartar el pedido.')
        }
        await tx.update(purchaseDetails).set({ quantityRemaining: lot.quantityRemaining - detailData.quantity, updatedAt: new Date() }).where(eq(purchaseDetails.id, lot.id))
        await tx.insert(inventoryMovements).values({
          productId: detailData.productId,
          purchaseDetailId: lot.id,
          movementType: 'order_reserved',
          quantity: -detailData.quantity,
          movementDate: new Date(),
          referenceType: 'order',
          referenceId: order.id,
          createdBy: data.createdBy,
        })
      }
      const [detail] = await tx.insert(orderDetails).values({ ...detailData, orderId: order.id }).returning()
      if (!detail) throw new Error('No se pudo guardar el detalle del pedido.')
      createdDetails.push(detail)
    }

    let payment
    if (data.payment) {
      const [createdPayment] = await tx.insert(payments).values({ ...data.payment, orderId: order.id }).returning()
      payment = createdPayment
    }
    return { order, details: createdDetails, payment }
  }),

  cancelTransactional: async (id: string, createdBy: string) => db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for('update')
    if (!order) return undefined
    if (order.orderStatus === 'cancelled') return order
    const reservedMovements = await tx.select().from(inventoryMovements).where(eq(inventoryMovements.referenceId, id))
    for (const movement of reservedMovements.filter((entry) => entry.movementType === 'order_reserved' && entry.quantity < 0 && entry.purchaseDetailId)) {
      const quantityToReturn = -movement.quantity
      await tx.update(purchaseDetails).set({ quantityRemaining: sql`${purchaseDetails.quantityRemaining} + ${quantityToReturn}`, updatedAt: new Date() }).where(eq(purchaseDetails.id, movement.purchaseDetailId!))
      await tx.insert(inventoryMovements).values({
        productId: movement.productId,
        purchaseDetailId: movement.purchaseDetailId,
        movementType: 'return',
        quantity: quantityToReturn,
        movementDate: new Date(),
        referenceType: 'order',
        referenceId: id,
        notes: 'Devolución por cancelación de pedido',
        createdBy,
      })
    }
    const [updated] = await tx.update(orders).set({ orderStatus: 'cancelled', reservationExpiresAt: null, updatedAt: new Date() }).where(eq(orders.id, id)).returning()
    return updated
  }),

  expireReservationsTransactional: async (now: Date, createdBy: string) => db.transaction(async (tx) => {
    const expiredOrders = await tx.select().from(orders)
      .where(and(inArray(orders.orderStatus, ['pending', 'confirmed']), lte(orders.reservationExpiresAt, now)))
      .for('update')

    const expired = [] as Array<typeof orders.$inferSelect>
    for (const order of expiredOrders) {
      const reservedMovements = await tx.select().from(inventoryMovements)
        .where(and(
          eq(inventoryMovements.referenceId, order.id),
          eq(inventoryMovements.referenceType, 'order'),
          eq(inventoryMovements.movementType, 'order_reserved'),
          lt(inventoryMovements.quantity, 0),
        ))

      for (const movement of reservedMovements) {
        if (!movement.purchaseDetailId) continue
        const quantityToReturn = -movement.quantity
        await tx.update(purchaseDetails)
          .set({ quantityRemaining: sql`${purchaseDetails.quantityRemaining} + ${quantityToReturn}`, updatedAt: new Date() })
          .where(eq(purchaseDetails.id, movement.purchaseDetailId))
        await tx.insert(inventoryMovements).values({
          productId: movement.productId,
          purchaseDetailId: movement.purchaseDetailId,
          movementType: 'return',
          quantity: quantityToReturn,
          movementDate: new Date(),
          referenceType: 'order',
          referenceId: order.id,
          notes: 'Devolución por vencimiento de reserva',
          createdBy,
        })
      }

      const [updated] = await tx.update(orders)
        .set({ orderStatus: 'cancelled', reservationExpiresAt: null, updatedAt: new Date() })
        .where(eq(orders.id, order.id))
        .returning()
      if (updated) expired.push(updated)
    }
    return expired
  }),

  recordPaymentTransactional: async (data: { id: string; amountCents: number; paymentMethod: string; idempotencyKey: string; createdBy: string; paymentStatus: string; paidAmountCents: number; pendingBalanceCents: number }) => db.transaction(async (tx) => {
    const [lockedOrder] = await tx.select().from(orders).where(eq(orders.id, data.id)).for('update')
    if (!lockedOrder) return { order: undefined, payment: undefined }
    if (lockedOrder.orderStatus === 'cancelled' || lockedOrder.orderStatus === 'delivered') {
      throw AppError.validation('No se pueden registrar pagos en un pedido cancelado o entregado.')
    }
    const [existingPayment] = await tx.select().from(payments).where(eq(payments.idempotencyKey, data.idempotencyKey))
    if (existingPayment) {
      if (existingPayment.orderId !== data.id) throw AppError.duplicate('La clave de idempotencia ya fue utilizada para otro pago.')
      const [existingOrder] = await tx.select().from(orders).where(eq(orders.id, data.id))
      return { order: existingOrder, payment: existingPayment }
    }
    const previousPayments = await tx.select().from(payments).where(eq(payments.orderId, data.id))
    const paidAmountCents = previousPayments
      .filter((row) => row.paymentStatus === 'active' || row.paymentStatus === 'compensation')
      .reduce((sum, row) => sum + row.amountCents, 0)
    if (paidAmountCents + data.amountCents > lockedOrder.totalCents) {
      throw AppError.validation('El pago no puede superar el saldo pendiente del pedido.')
    }
    const nextPaidAmountCents = paidAmountCents + data.amountCents
    const nextPaymentStatus = nextPaidAmountCents >= lockedOrder.totalCents ? 'paid' : 'partial'
    const [payment] = await tx.insert(payments).values({ orderId: data.id, saleId: null, amountCents: data.amountCents, paymentMethod: data.paymentMethod, paymentDate: new Date(), idempotencyKey: data.idempotencyKey, notes: null, createdBy: data.createdBy }).returning()
    const [order] = await tx.update(orders).set({ paidAmountCents: nextPaidAmountCents, pendingBalanceCents: lockedOrder.totalCents - nextPaidAmountCents, paymentStatus: nextPaymentStatus, updatedAt: new Date() }).where(eq(orders.id, data.id)).returning()
    return { order, payment }
  }),

  correctPaymentTransactional: async (data: { orderId: string; paymentId: string; correctionNote?: string; correctedBy: string }) => db.transaction(async (tx) => {
    const [lockedOrder] = await tx.select().from(orders).where(eq(orders.id, data.orderId)).for('update')
    if (!lockedOrder) throw AppError.notFound('Pedido no encontrado.')
    const [payment] = await tx.select().from(payments)
      .where(and(eq(payments.id, data.paymentId), eq(payments.orderId, data.orderId)))
      .for('update')
    if (!payment) throw AppError.notFound('Pago del pedido no encontrado.')
    if (payment.paymentStatus !== 'active' && payment.paymentStatus !== 'corrected') {
      throw AppError.duplicate('El pago ya fue corregido.')
    }

    if (payment.paymentStatus === 'active') {
      await tx.update(payments).set({
        paymentStatus: 'corrected',
        correctedAt: new Date(),
        correctionNote: data.correctionNote?.trim() || null,
      }).where(eq(payments.id, payment.id))
      const [existingCompensation] = await tx.select().from(payments)
        .where(eq(payments.idempotencyKey, `correction-${payment.id}`))
      if (!existingCompensation) {
        await tx.insert(payments).values({
          orderId: data.orderId,
          saleId: null,
          amountCents: -payment.amountCents,
          paymentMethod: payment.paymentMethod,
          paymentStatus: 'compensation',
          paymentDate: new Date(),
          idempotencyKey: `correction-${payment.id}`,
          notes: data.correctionNote?.trim() || 'Pago compensatorio por corrección',
          correctionNote: data.correctionNote?.trim() || null,
          createdBy: data.correctedBy,
        })
      }
    }
    const paymentRows = await tx.select().from(payments).where(eq(payments.orderId, data.orderId))
    const paidAmountCents = Math.max(0, paymentRows
      .filter((row) => row.paymentStatus === 'active' || row.paymentStatus === 'compensation')
      .reduce((sum, row) => sum + row.amountCents, 0))
    const pendingBalanceCents = Math.max(0, lockedOrder.totalCents - paidAmountCents)
    const [order] = await tx.update(orders).set({
      paidAmountCents,
      pendingBalanceCents,
      paymentStatus: paidAmountCents >= lockedOrder.totalCents ? 'paid' : paidAmountCents > 0 ? 'partial' : 'unpaid',
      updatedAt: new Date(),
    }).where(eq(orders.id, data.orderId)).returning()
    if (!order) throw AppError.notFound('Pedido no encontrado.')
    return { order, payment }
  }),
}
