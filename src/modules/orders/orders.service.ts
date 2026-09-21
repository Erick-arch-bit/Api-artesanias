import { AppError } from '../../shared/errors/app-error'
import { ordersRepository } from './orders.repository'
import { salesService } from '../sales/sales.service'

export const ordersService = {
  validateReservationRule: ({ paidAmountCents, orderStatus }: { paidAmountCents: number; orderStatus: string }) => {
    if (!Number.isInteger(paidAmountCents) || paidAmountCents < 0) {
      return false
    }

    return paidAmountCents > 0 && orderStatus === 'pending'
  },

  calculateSummary: ({
    subtotalCents,
    discountCents = 0,
    deliveryFeeCents = 0,
    deliveryTransportCostCents = 0,
    deliveryPackagingCostCents = 0,
    otherDeliveryCostCents = 0,
    productCostTotalCents = 0,
    paidAmountCents = 0,
  }: {
    subtotalCents: number
    discountCents?: number
    deliveryFeeCents?: number
    deliveryTransportCostCents?: number
    deliveryPackagingCostCents?: number
    otherDeliveryCostCents?: number
    productCostTotalCents?: number
    paidAmountCents?: number
  }) => {
    const values = [
      subtotalCents,
      discountCents,
      deliveryFeeCents,
      deliveryTransportCostCents,
      deliveryPackagingCostCents,
      otherDeliveryCostCents,
      productCostTotalCents,
      paidAmountCents,
    ]

    if (values.some((value) => !Number.isInteger(value) || value < 0)) {
      throw AppError.validation('Los importes del pedido deben ser enteros no negativos.')
    }

    const totalCents = Math.max(0, subtotalCents - discountCents + deliveryFeeCents)
    if (paidAmountCents > totalCents) {
      throw AppError.validation('El pago no puede superar el total del pedido.')
    }
    const pendingBalanceCents = Math.max(0, totalCents - paidAmountCents)
    const deliveryCostCents = deliveryTransportCostCents + deliveryPackagingCostCents + otherDeliveryCostCents

    return {
      totalCents,
      paidAmountCents: Math.min(paidAmountCents, totalCents),
      pendingBalanceCents,
      productCostTotalCents,
      grossProfitCents: totalCents - productCostTotalCents,
      netProfitCents: totalCents - productCostTotalCents - deliveryCostCents,
      paymentStatus: paidAmountCents >= totalCents ? 'paid' : paidAmountCents > 0 ? 'partial' : 'unpaid',
    }
  },

  validateStatusTransition: (from: string, to: string) => {
    const transitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    }

    if (!transitions[from]?.includes(to)) {
      throw AppError.validation(`No se puede cambiar el pedido de ${from} a ${to}.`)
    }

    return true
  },

  validateDelivery: ({ deliveryDate, deliveryPoint }: { deliveryDate: Date | string; deliveryPoint: string }) => {
    const date = new Date(deliveryDate)
    if (Number.isNaN(date.getTime())) {
      throw AppError.validation('La fecha de entrega no es válida.')
    }

    if (!deliveryPoint.trim()) {
      throw AppError.validation('El punto de entrega es obligatorio.')
    }

    return { deliveryDate: date, deliveryPoint: deliveryPoint.trim() }
  },

  createOrder: async (payload: {
    customerId: string
    orderChannel?: string
    items: Array<{
      productId: string
      quantity: number
      pricingMode?: 'unit' | 'dozen'
    }>
    discountCents?: number
    deliveryFeeCents?: number
    deliveryTransportCostCents?: number
    deliveryPackagingCostCents?: number
    otherDeliveryCostCents?: number
    initialPaymentCents?: number
    initialPaymentMethod?: 'cash' | 'transfer' | 'deposit' | 'other'
    deliveryDate?: string
    deliveryTime?: string
    deliveryPoint?: string
    notes?: string
  }, createdBy: string) => {
    const productIds = payload.items.map((item) => item.productId)
    if (new Set(productIds).size !== productIds.length) {
      throw AppError.validation('No se puede repetir un producto en el pedido.')
    }

    const resolvedItems: Array<{
      productId: string
      purchaseDetailId?: string
      quantity: number
      unitSalePriceCents: number
      unitCostAtSaleCents: number
      subtotalCents: number
      costTotalCents: number
    }> = []

    for (const item of payload.items) {
      const product = await ordersRepository.findProductById(item.productId)
      if (!product || !product.active) throw AppError.invalidReference('El producto no existe o está inactivo.')
      const pricingMode = item.pricingMode ?? 'unit'
      const pricing = salesService.getPriceForProduct({ product, quantity: item.quantity, pricingMode })
      const lots = await ordersRepository.findAvailableLotsByProductId(item.productId)
      const allocation = salesService.allocateStockByFifo({
        lots: lots.map((lot) => ({ quantityRemaining: lot.quantityRemaining, unitCostCents: lot.realUnitCostCents, costRemainingCents: lot.costRemainingCents })),
        requestedQuantity: item.quantity,
      })

      for (const consumed of allocation.consumed) {
        const lot = lots[consumed.lotIndex]
        if (!lot) throw AppError.internal('No se pudo resolver el lote del inventario.')
        resolvedItems.push({
          productId: item.productId,
          purchaseDetailId: lot.id,
          quantity: consumed.quantity,
          unitSalePriceCents: pricing.unitPriceCents,
          unitCostAtSaleCents: Math.floor(consumed.costCents / consumed.quantity),
          subtotalCents: Math.round(pricing.subtotalCents * (consumed.quantity / item.quantity)),
          costTotalCents: consumed.costCents,
        })
      }
    }

    const subtotalCents = resolvedItems.reduce((sum, item) => sum + item.subtotalCents, 0)
    const productCostTotalCents = resolvedItems.reduce((sum, item) => sum + item.costTotalCents, 0)
    const summary = ordersService.calculateSummary({
      subtotalCents,
      discountCents: payload.discountCents,
      deliveryFeeCents: payload.deliveryFeeCents,
      deliveryTransportCostCents: payload.deliveryTransportCostCents,
      deliveryPackagingCostCents: payload.deliveryPackagingCostCents,
      otherDeliveryCostCents: payload.otherDeliveryCostCents,
      productCostTotalCents,
      paidAmountCents: payload.initialPaymentCents,
    })

    const delivery = payload.deliveryDate && payload.deliveryPoint
      ? ordersService.validateDelivery({ deliveryDate: payload.deliveryDate, deliveryPoint: payload.deliveryPoint })
      : undefined

    const orderData = {
      customerId: payload.customerId,
      orderChannel: payload.orderChannel ?? 'whatsapp',
      orderStatus: 'pending',
      paymentStatus: summary.paymentStatus,
      subtotalCents,
      discountCents: payload.discountCents ?? 0,
      deliveryFeeCents: payload.deliveryFeeCents ?? 0,
      deliveryTransportCostCents: payload.deliveryTransportCostCents ?? 0,
      deliveryPackagingCostCents: payload.deliveryPackagingCostCents ?? 0,
      otherDeliveryCostCents: payload.otherDeliveryCostCents ?? 0,
      totalCents: summary.totalCents,
      paidAmountCents: summary.paidAmountCents,
      pendingBalanceCents: summary.pendingBalanceCents,
      productCostTotalCents: summary.productCostTotalCents,
      grossProfitCents: summary.grossProfitCents,
      netProfitCents: summary.netProfitCents,
      orderDate: new Date(),
      deliveryDate: delivery?.deliveryDate,
      deliveryTime: payload.deliveryTime,
      deliveryPoint: delivery?.deliveryPoint,
      notes: payload.notes?.trim() || null,
      reservationExpiresAt: ordersService.validateReservationRule({
        paidAmountCents: summary.paidAmountCents,
        orderStatus: 'pending',
      }) ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null,
      createdBy,
    }

    const initialPayment = payload.initialPaymentCents ?? 0
    const result = await ordersRepository.createTransactional({
      order: orderData,
      details: resolvedItems,
      reserve: initialPayment > 0,
      payment: initialPayment > 0 ? {
        orderId: null,
        saleId: null,
        amountCents: initialPayment,
        paymentMethod: payload.initialPaymentMethod ?? 'cash',
        paymentDate: new Date(),
        idempotencyKey: `order-${createdBy}-${Date.now()}-${initialPayment}`,
        notes: 'Pago inicial de pedido',
        createdBy,
      } : undefined,
      createdBy,
    })

    return { ...result, summary }
  },

  updateStatus: async (id: string, status: string) => {
    const order = await ordersRepository.findById(id)
    if (!order) throw AppError.notFound('Pedido no encontrado.')
    ordersService.validateStatusTransition(order.orderStatus, status)
    const updated = await ordersRepository.update(id, { orderStatus: status })
    if (!updated) throw AppError.internal('No se pudo actualizar el pedido.')
    return updated
  },

  cancel: async (id: string, createdBy: string) => {
    const order = await ordersRepository.findById(id)
    if (!order) throw AppError.notFound('Pedido no encontrado.')
    if (order.orderStatus === 'delivered') throw AppError.validation('No se puede cancelar un pedido entregado.')
    const updated = await ordersRepository.cancelTransactional(id, createdBy)
    if (!updated) throw AppError.internal('No se pudo cancelar el pedido.')
    return updated
  },

  recordPayment: async (id: string, amountCents: number, paymentMethod: string, createdBy: string, idempotencyKey?: string) => {
    const order = await ordersRepository.findById(id)
    if (!order) throw AppError.notFound('Pedido no encontrado.')
    if (order.orderStatus === 'cancelled' || order.orderStatus === 'delivered') {
      throw AppError.validation('No se pueden registrar pagos en un pedido cancelado o entregado.')
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) throw AppError.validation('El pago debe ser un entero positivo.')
    const result = await ordersRepository.recordPaymentTransactional({ id, amountCents, paymentMethod, createdBy, idempotencyKey: idempotencyKey ?? crypto.randomUUID(), paymentStatus: 'partial', paidAmountCents: order.paidAmountCents, pendingBalanceCents: order.pendingBalanceCents })
    if (!result?.payment || !result.order) throw AppError.internal('No se pudo registrar el pago del pedido.')
    return result
  },

  correctPayment: async (orderId: string, paymentId: string, correctionNote: string | undefined, correctedBy: string) => {
    const order = await ordersRepository.findById(orderId)
    if (!order) throw AppError.notFound('Pedido no encontrado.')
    return ordersRepository.correctPaymentTransactional({ orderId, paymentId, correctionNote, correctedBy })
  },

  expireReservations: async (createdBy: string, now = new Date()) => ordersRepository.expireReservationsTransactional(now, createdBy),

  registerDelivery: async (id: string, payload: {
    deliveryDate: string
    deliveryPoint: string
    deliveryTime?: string
    deliveryTransportCostCents?: number
    deliveryPackagingCostCents?: number
    otherDeliveryCostCents?: number
  }) => {
    const order = await ordersRepository.findById(id)
    if (!order) throw AppError.notFound('Pedido no encontrado.')
    ordersService.validateStatusTransition(order.orderStatus, 'delivered')
    const delivery = ordersService.validateDelivery(payload)
    const summary = ordersService.calculateSummary({
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      deliveryFeeCents: order.deliveryFeeCents,
      deliveryTransportCostCents: payload.deliveryTransportCostCents,
      deliveryPackagingCostCents: payload.deliveryPackagingCostCents,
      otherDeliveryCostCents: payload.otherDeliveryCostCents,
      productCostTotalCents: order.productCostTotalCents,
      paidAmountCents: order.paidAmountCents,
    })
    const updated = await ordersRepository.update(id, {
      orderStatus: 'delivered',
      deliveryDate: delivery.deliveryDate,
      deliveryPoint: delivery.deliveryPoint,
      deliveryTime: payload.deliveryTime,
      deliveryTransportCostCents: payload.deliveryTransportCostCents ?? 0,
      deliveryPackagingCostCents: payload.deliveryPackagingCostCents ?? 0,
      otherDeliveryCostCents: payload.otherDeliveryCostCents ?? 0,
      netProfitCents: summary.netProfitCents,
    })
    if (!updated) throw AppError.internal('No se pudo registrar la entrega.')
    return updated
  },
}
