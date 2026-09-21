import { and, asc, count, eq, sql } from 'drizzle-orm'
import { db } from '../../database/client'
import { inventoryMovements, payments, products, purchaseDetails, saleDetails, sales } from '../../database/schema'
import { AppError } from '../../shared/errors/app-error'
import { getPagination, type PaginationInput } from '../../shared/http/pagination'

export const salesRepository = {
  findAll: async (pagination: PaginationInput = {}) => {
    const { limit, offset } = getPagination(pagination)
    const [items, countRows] = await Promise.all([
      db.select().from(sales).orderBy(asc(sales.soldAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(sales),
    ])
    return { items, total: Number(countRows[0]?.total ?? 0) }
  },

  findById: async (id: string) => {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id))
    return sale
  },

  findProductById: async (id: string) => {
    const [product] = await db.select().from(products).where(eq(products.id, id))
    return product
  },

  findDetailsBySaleId: (saleId: string) => db.select().from(saleDetails).where(eq(saleDetails.saleId, saleId)).orderBy(asc(saleDetails.createdAt)),

  findPaymentsBySaleId: (saleId: string) => db.select().from(payments).where(eq(payments.saleId, saleId)).orderBy(asc(payments.paymentDate)),

  create: async (data: typeof sales.$inferInsert) => {
    const [sale] = await db.insert(sales).values(data).returning()
    return sale
  },

  createDetail: async (data: typeof saleDetails.$inferInsert) => {
    const [detail] = await db.insert(saleDetails).values(data).returning()
    return detail
  },

  createPayment: async (data: typeof payments.$inferInsert) => {
    const [payment] = await db.insert(payments).values(data).returning()
    return payment
  },

  createTransactional: async (data: {
    sale: typeof sales.$inferInsert
    items: Array<{
      productId: string
      quantity: number
      unitSalePriceCents: number
      subtotalCents: number
    }>
    payment?: typeof payments.$inferInsert
    createdBy: string
  }) => db.transaction(async (tx) => {
    const [sale] = await tx.insert(sales).values(data.sale).returning()
    if (!sale) throw new Error('No se pudo registrar la venta.')

    const details = [] as Array<typeof saleDetails.$inferSelect>
    let totalCostCents = 0

    for (const item of data.items) {
      const lots = await tx
        .select()
        .from(purchaseDetails)
        .where(eq(purchaseDetails.productId, item.productId))
        .orderBy(asc(purchaseDetails.createdAt))
        .for('update')

      let remaining = item.quantity
      for (const lot of lots) {
        if (remaining === 0) break
        if (lot.quantityRemaining <= 0) continue
        const quantity = Math.min(remaining, lot.quantityRemaining)
        const costTotalCents = lot.costRemainingCents > 0
          ? (quantity === lot.quantityRemaining ? lot.costRemainingCents : Math.floor(lot.costRemainingCents * (quantity / lot.quantityRemaining)))
          : quantity * lot.realUnitCostCents
        const [updatedLot] = await tx
          .update(purchaseDetails)
          .set({ quantityRemaining: sql`${purchaseDetails.quantityRemaining} - ${quantity}`, costRemainingCents: lot.costRemainingCents > 0 ? sql`${purchaseDetails.costRemainingCents} - ${costTotalCents}` : 0, updatedAt: new Date() })
          .where(eq(purchaseDetails.id, lot.id))
          .returning()
        if (!updatedLot) throw new Error('No se pudo descontar el lote de inventario.')

        const [detail] = await tx.insert(saleDetails).values({
          saleId: sale.id,
          productId: item.productId,
          purchaseDetailId: lot.id,
          quantity,
          unitSalePriceCents: item.unitSalePriceCents,
          unitCostAtSaleCents: lot.realUnitCostCents,
          subtotalCents: Math.round(item.subtotalCents * (quantity / item.quantity)),
          costTotalCents,
        }).returning()
        if (!detail) throw new Error('No se pudo guardar el detalle de la venta.')
        details.push(detail)

        await tx.insert(inventoryMovements).values({
          productId: item.productId,
          purchaseDetailId: lot.id,
          movementType: 'patio_sale',
          quantity: -quantity,
          movementDate: new Date(),
          referenceType: 'sale',
          referenceId: sale.id,
          createdBy: data.createdBy,
        })
        totalCostCents += costTotalCents
        remaining -= quantity
      }

      if (remaining > 0) throw new Error(`Stock insuficiente para el producto ${item.productId}.`)
    }

    let paymentStatus = sale.paymentStatus
    if (data.payment) {
      await tx.insert(payments).values({ ...data.payment, saleId: sale.id })
      paymentStatus = data.payment.amountCents >= sale.totalCents ? 'paid' : 'partial'
    }
    const grossProfitCents = sale.totalCents - totalCostCents
    const [updatedSale] = await tx.update(sales).set({ totalCostCents, grossProfitCents, paymentStatus, updatedAt: new Date() }).where(eq(sales.id, sale.id)).returning()
    return { sale: updatedSale ?? sale, details, totalCostCents }
  }),

  recordPaymentTransactional: async (data: {
    saleId: string
    amountCents: number
    paymentMethod: string
    idempotencyKey: string
    createdBy: string
  }) => db.transaction(async (tx) => {
    const [sale] = await tx.select().from(sales).where(eq(sales.id, data.saleId)).for('update')
    if (!sale) return undefined
    if (sale.saleStatus !== 'active') throw AppError.validation('No se pueden registrar pagos en una venta cancelada.')
    const [existingPayment] = await tx.select().from(payments).where(eq(payments.idempotencyKey, data.idempotencyKey))
    if (existingPayment) {
      if (existingPayment.saleId !== sale.id) throw AppError.duplicate('La clave de idempotencia ya fue utilizada para otro pago.')
      const paidAmountCents = (await tx.select().from(payments).where(eq(payments.saleId, sale.id)))
        .filter((row) => row.paymentStatus === 'active' || row.paymentStatus === 'compensation')
        .reduce((sum, row) => sum + row.amountCents, 0)
      return { sale, payment: existingPayment, paidAmountCents }
    }
    const previousPayments = await tx.select().from(payments).where(eq(payments.saleId, sale.id))
    const previousPaidAmountCents = previousPayments
      .filter((row) => row.paymentStatus === 'active' || row.paymentStatus === 'compensation')
      .reduce((sum, row) => sum + row.amountCents, 0)
    if (previousPaidAmountCents + data.amountCents > sale.totalCents) {
      throw AppError.validation('El pago no puede superar el saldo pendiente de la venta.')
    }
    const [payment] = await tx.insert(payments).values({ saleId: sale.id, orderId: null, amountCents: data.amountCents, paymentMethod: data.paymentMethod, paymentDate: new Date(), idempotencyKey: data.idempotencyKey, notes: null, createdBy: data.createdBy }).returning()
    const previous = await tx.select().from(payments).where(eq(payments.saleId, sale.id))
    const paidAmountCents = previous.reduce((sum, row) => sum + row.amountCents, 0)
    const [updatedSale] = await tx.update(sales).set({ paymentStatus: paidAmountCents >= sale.totalCents ? 'paid' : 'partial', updatedAt: new Date() }).where(eq(sales.id, sale.id)).returning()
    return { sale: updatedSale ?? sale, payment, paidAmountCents }
  }),

  correctPaymentTransactional: async (data: { saleId: string; paymentId: string; correctionNote?: string; correctedBy: string }) => db.transaction(async (tx) => {
    const [sale] = await tx.select().from(sales).where(eq(sales.id, data.saleId)).for('update')
    if (!sale) throw AppError.notFound('Venta no encontrada.')
    const [payment] = await tx.select().from(payments)
      .where(and(eq(payments.id, data.paymentId), eq(payments.saleId, data.saleId)))
      .for('update')
    if (!payment) throw AppError.notFound('Pago de la venta no encontrado.')
    if (payment.paymentStatus !== 'active' && payment.paymentStatus !== 'corrected') {
      throw AppError.duplicate('El pago ya fue corregido.')
    }

    if (payment.paymentStatus === 'active') {
      await tx.update(payments).set({ paymentStatus: 'corrected', correctedAt: new Date(), correctionNote: data.correctionNote?.trim() || null }).where(eq(payments.id, payment.id))
      const [existingCompensation] = await tx.select().from(payments)
        .where(eq(payments.idempotencyKey, `correction-${payment.id}`))
      if (!existingCompensation) {
        await tx.insert(payments).values({
          saleId: data.saleId,
          orderId: null,
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
    const rows = await tx.select().from(payments).where(eq(payments.saleId, data.saleId))
    const paidAmountCents = Math.max(0, rows.filter((row) => row.paymentStatus === 'active' || row.paymentStatus === 'compensation').reduce((sum, row) => sum + row.amountCents, 0))
    const [updatedSale] = await tx.update(sales).set({
      paymentStatus: paidAmountCents >= sale.totalCents ? 'paid' : paidAmountCents > 0 ? 'partial' : 'pending',
      updatedAt: new Date(),
    }).where(eq(sales.id, data.saleId)).returning()
    return { sale: updatedSale ?? sale, payment }
  }),

  cancelTransactional: async (id: string, createdBy: string) => db.transaction(async (tx) => {
    const [sale] = await tx.select().from(sales).where(eq(sales.id, id)).for('update')
    if (!sale) return undefined
    if (sale.saleStatus === 'cancelled') throw AppError.duplicate('La venta ya fue cancelada.')

    const salePayments = await tx.select().from(payments).where(eq(payments.saleId, id))
    if (salePayments.length > 0) {
      throw AppError.validation('No se puede cancelar una venta que tiene pagos registrados.')
    }

    const details = await tx.select().from(saleDetails).where(eq(saleDetails.saleId, id))
    for (const detail of details) {
      await tx.update(purchaseDetails)
        .set({
          quantityRemaining: sql`${purchaseDetails.quantityRemaining} + ${detail.quantity}`,
          costRemainingCents: sql`${purchaseDetails.costRemainingCents} + ${detail.costTotalCents}`,
          updatedAt: new Date(),
        })
        .where(eq(purchaseDetails.id, detail.purchaseDetailId))

      await tx.insert(inventoryMovements).values({
        productId: detail.productId,
        purchaseDetailId: detail.purchaseDetailId,
        movementType: 'return',
        quantity: detail.quantity,
        movementDate: new Date(),
        referenceType: 'sale',
        referenceId: id,
        notes: 'Devolución por cancelación de venta',
        createdBy,
      })
    }

    const [updatedSale] = await tx.update(sales)
      .set({ saleStatus: 'cancelled', updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning()
    return updatedSale
  }),
}
