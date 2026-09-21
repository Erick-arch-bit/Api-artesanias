import { AppError } from '../../shared/errors/app-error'
import { salesRepository } from './sales.repository'

export const salesService = {
  validateDozenQuantity: ({ quantity, pricingMode }: { quantity: number; pricingMode: 'unit' | 'dozen' }) => {
    if (pricingMode === 'dozen') {
      return Number.isInteger(quantity) && quantity > 0 && quantity % 12 === 0
    }

    return Number.isInteger(quantity) && quantity > 0
  },

  calculateSaleTotals: ({ itemPriceCents, quantity, discountCents }: { itemPriceCents: number; quantity: number; discountCents: number }) => {
    const subtotalCents = itemPriceCents * quantity
    const discount = Math.max(0, discountCents)
    const totalCents = subtotalCents - discount

    return {
      subtotalCents,
      discountCents: discount,
      totalCents: Math.max(0, totalCents),
    }
  },

  getPriceForProduct: ({
    product,
    quantity,
    pricingMode,
  }: {
    product: { salePriceCents: number; dozenPriceCents?: number | null }
    quantity: number
    pricingMode: 'unit' | 'dozen'
  }) => {
    if (pricingMode === 'dozen') {
      if (!product.dozenPriceCents) {
        throw AppError.validation('Este producto no tiene precio por docena disponible.')
      }
      if (!salesService.validateDozenQuantity({ quantity, pricingMode: 'dozen' })) {
        throw AppError.validation('La cantidad para precio por docena debe ser múltiplo de 12.')
      }

      return {
        unitPriceCents: Math.round(product.dozenPriceCents / 12),
        subtotalCents: product.dozenPriceCents * (quantity / 12),
      }
    }

    return {
      unitPriceCents: product.salePriceCents,
      subtotalCents: product.salePriceCents * quantity,
    }
  },

  buildLineTotals: ({
    product,
    quantity,
    pricingMode,
    discountCents,
  }: {
    product: { salePriceCents: number; dozenPriceCents?: number | null }
    quantity: number
    pricingMode: 'unit' | 'dozen'
    discountCents?: number
  }) => {
    const { unitPriceCents, subtotalCents } = salesService.getPriceForProduct({
      product,
      quantity,
      pricingMode,
    })

    const discount = Math.max(0, discountCents ?? 0)
    const totalCents = Math.max(0, subtotalCents - discount)

    return {
      unitPriceCents,
      subtotalCents,
      discountCents: discount,
      totalCents,
    }
  },

  validateStockAvailability: ({ requestedQuantity, availableQuantity }: { requestedQuantity: number; availableQuantity: number }) => {
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 0) {
      throw AppError.validation('La cantidad solicitada no es válida.')
    }

    if (!Number.isInteger(availableQuantity) || availableQuantity < 0) {
      throw AppError.validation('La cantidad disponible no es válida.')
    }

    if (requestedQuantity > availableQuantity) {
      throw AppError.validation(`No hay stock suficiente. Solicitado: ${requestedQuantity}, disponible: ${availableQuantity}.`)
    }

    return true
  },

  allocateStockByFifo: ({
    lots,
    requestedQuantity,
  }: {
    lots: Array<{ quantityRemaining: number; unitCostCents: number; costRemainingCents?: number }>
    requestedQuantity: number
  }) => {
    const sanitizedLots = lots.map((lot) => ({
      quantityRemaining: Math.max(0, lot.quantityRemaining),
      unitCostCents: Math.max(0, lot.unitCostCents),
      costRemainingCents: Math.max(0, lot.costRemainingCents ?? 0),
    }))

    salesService.validateStockAvailability({
      requestedQuantity,
      availableQuantity: sanitizedLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0),
    })

    let remainingToAllocate = requestedQuantity
    const consumed: Array<{ lotIndex: number; quantity: number; costCents: number }> = []
    let totalCostCents = 0

    for (let index = 0; index < sanitizedLots.length && remainingToAllocate > 0; index += 1) {
      const lot = sanitizedLots[index]!
      if (lot.quantityRemaining <= 0) continue

      const qtyFromLot = Math.min(lot.quantityRemaining, remainingToAllocate)
      const costCents = lot.costRemainingCents !== undefined && lot.costRemainingCents > 0
        ? Math.floor(lot.costRemainingCents * (qtyFromLot / lot.quantityRemaining))
        : qtyFromLot * lot.unitCostCents

      consumed.push({
        lotIndex: index,
        quantity: qtyFromLot,
        costCents,
      })

      totalCostCents += costCents
      remainingToAllocate -= qtyFromLot
    }

    return {
      totalCostCents,
      remainingQuantity: remainingToAllocate,
      consumed,
    }
  },

  buildSaleSummary: ({
    items,
    discountCents,
  }: {
    items: Array<{
      product: { salePriceCents: number; dozenPriceCents?: number | null }
      quantity: number
      pricingMode: 'unit' | 'dozen'
      availableLots: Array<{ quantityRemaining: number; unitCostCents: number; costRemainingCents?: number }>
    }>
    discountCents?: number
  }) => {
    let subtotalCents = 0
    let totalCostCents = 0

    for (const item of items) {
      const lineTotals = salesService.buildLineTotals({
        product: item.product,
        quantity: item.quantity,
        pricingMode: item.pricingMode,
      })

      subtotalCents += lineTotals.subtotalCents

      const allocation = salesService.allocateStockByFifo({
        lots: item.availableLots,
        requestedQuantity: item.quantity,
      })

      totalCostCents += allocation.totalCostCents
    }

    const totalDiscountCents = Math.max(0, discountCents ?? 0)
    const totalCents = Math.max(0, subtotalCents - totalDiscountCents)
    const grossProfitCents = totalCents - totalCostCents

    return {
      subtotalCents,
      totalDiscountCents,
      totalCents,
      totalCostCents,
      grossProfitCents,
    }
  },

  createSale: async (
    payload: {
      saleType?: string
      items: Array<{
        productId: string
        quantity: number
        pricingMode: 'unit' | 'dozen'
      }>
      discountCents?: number
      notes?: string | null
      initialPaymentCents?: number
    },
    createdBy: string,
  ) => {
    if (!payload.items.length) {
      throw AppError.validation('Debes incluir al menos un producto en la venta.')
    }

    const summaryItems = [] as Array<{
      product: { salePriceCents: number; dozenPriceCents?: number | null }
      quantity: number
      pricingMode: 'unit' | 'dozen'
      availableLots: Array<{ quantityRemaining: number; unitCostCents: number }>
    }>

    for (const item of payload.items) {
      const product = await salesRepository.findProductById(item.productId)
      if (!product || !product.active) throw AppError.invalidReference('El producto no existe o está inactivo.')
      summaryItems.push({ product, quantity: item.quantity, pricingMode: item.pricingMode, availableLots: [{ quantityRemaining: item.quantity, unitCostCents: 0 }] })
    }

    const summary = salesService.buildSaleSummary({
      items: summaryItems,
      discountCents: payload.discountCents ?? 0,
    })

    const saleData = {
      saleType: payload.saleType ?? 'patio',
      subtotalCents: summary.subtotalCents,
      discountCents: summary.totalDiscountCents,
      totalCents: summary.totalCents,
      totalCostCents: summary.totalCostCents,
      grossProfitCents: summary.grossProfitCents,
      paymentStatus: (payload.initialPaymentCents ?? 0) > 0 ? 'partial' : 'pending',
      notes: payload.notes?.trim() || null,
      soldAt: new Date(),
      createdBy,
    }
    const initialPayment = payload.initialPaymentCents ?? 0
    if (initialPayment > summary.totalCents) {
      throw AppError.validation('El pago inicial no puede superar el total de la venta.')
    }
    const result = await salesRepository.createTransactional({
      sale: saleData,
      items: payload.items.map((item, index) => {
        const line = salesService.buildLineTotals({ product: summaryItems[index]!.product, quantity: item.quantity, pricingMode: item.pricingMode })
        return { productId: item.productId, quantity: item.quantity, unitSalePriceCents: line.unitPriceCents, subtotalCents: line.subtotalCents }
      }),
      payment: initialPayment > 0 ? {
        saleId: null,
        orderId: null,
        amountCents: initialPayment,
        paymentMethod: 'cash',
        paymentDate: new Date(),
        idempotencyKey: crypto.randomUUID(),
        notes: 'Pago inicial de venta',
        createdBy,
      } : undefined,
      createdBy,
    })

    const paymentStatus = initialPayment >= summary.totalCents ? 'paid' : initialPayment > 0 ? 'partial' : 'pending'

    return {
      sale: {
        ...result.sale,
        paymentStatus,
        paidAmountCents: initialPayment,
      },
      summary: { ...summary, totalCostCents: result.totalCostCents, grossProfitCents: summary.totalCents - result.totalCostCents },
    }
  },

  recordPayment: async (
    saleId: string,
    payload: { amountCents: number; paymentMethod: string; idempotencyKey?: string },
    createdBy: string,
  ) => {
    const existing = await salesRepository.findById(saleId)
    if (!existing) {
      throw AppError.notFound('Venta no encontrada.')
    }
    if (existing.saleStatus && existing.saleStatus !== 'active') {
      throw AppError.validation('No se pueden registrar pagos en una venta cancelada.')
    }

    const amount = Number(payload.amountCents)
    if (!Number.isInteger(amount) || amount <= 0) {
      throw AppError.validation('El monto del pago debe ser un entero positivo.')
    }
    const result = await salesRepository.recordPaymentTransactional({ saleId: existing.id, amountCents: amount, paymentMethod: payload.paymentMethod, idempotencyKey: payload.idempotencyKey ?? crypto.randomUUID(), createdBy })
    if (!result?.payment) throw AppError.internal('No se pudo registrar el pago.')

    return {
      payment: result.payment,
      paymentStatus: result.sale.paymentStatus,
      paidAmountCents: result.paidAmountCents,
    }
  },

  correctPayment: async (saleId: string, paymentId: string, correctionNote: string | undefined, correctedBy: string) => {
    const sale = await salesRepository.findById(saleId)
    if (!sale) throw AppError.notFound('Venta no encontrada.')
    return salesRepository.correctPaymentTransactional({ saleId, paymentId, correctionNote, correctedBy })
  },

  cancel: async (id: string, createdBy: string) => {
    const sale = await salesRepository.findById(id)
    if (!sale) throw AppError.notFound('Venta no encontrada.')
    const cancelled = await salesRepository.cancelTransactional(id, createdBy)
    if (!cancelled) throw AppError.internal('No se pudo cancelar la venta.')
    return cancelled
  },
}
