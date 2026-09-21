import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { salesService } from './sales.service'

type SaleRecord = {
  id: string
  subtotalCents: number
  discountCents: number
  totalCents: number
  totalCostCents: number
  grossProfitCents: number
  paymentStatus: string
  soldAt: Date
  createdBy: string
}

const mockRepo = {
  findAll: mock(() => Promise.resolve([])),
  findById: mock((_id: string) => Promise.resolve(undefined)),
  findProductById: mock((_id: string) => Promise.resolve({ salePriceCents: 3000, dozenPriceCents: 33000, active: true })),
  create: mock((_data: Record<string, unknown>) => Promise.resolve({ id: 'sale-1' } as SaleRecord)),
  createDetail: mock((_data: Record<string, unknown>) => Promise.resolve({ id: 'detail-1' })),
  createPayment: mock((_data: Record<string, unknown>) => Promise.resolve({ id: 'pay-1' })),
  recordPaymentTransactional: mock((_data: Record<string, unknown>) => Promise.resolve({ sale: { id: 'sale-1', paymentStatus: 'partial' }, payment: { id: 'pay-1' }, paidAmountCents: 4000 })),
  cancelTransactional: mock((_id: string, _createdBy: string) => Promise.resolve({ id: 'sale-1', saleStatus: 'cancelled' })),
  createTransactional: mock((_data: Record<string, unknown>) => Promise.resolve({ sale: { id: 'sale-1', subtotalCents: 33000, totalCents: 32500 }, details: [], totalCostCents: 26400 })),
}

mock.module('./sales.repository', () => ({
  salesRepository: mockRepo,
}))

beforeEach(() => {
  mockRepo.findAll.mockReset()
  mockRepo.findById.mockReset()
  mockRepo.findProductById.mockReset()
  mockRepo.create.mockReset()
  mockRepo.createDetail.mockReset()
  mockRepo.createPayment.mockReset()
  mockRepo.recordPaymentTransactional.mockReset()
  mockRepo.cancelTransactional.mockReset()
  mockRepo.createTransactional.mockReset()

  mockRepo.findAll.mockImplementation(() => Promise.resolve([]))
  mockRepo.findById.mockImplementation((_id: string) => Promise.resolve(undefined))
  mockRepo.findProductById.mockImplementation((_id: string) => Promise.resolve({ salePriceCents: 3000, dozenPriceCents: 33000, active: true }))
  mockRepo.create.mockImplementation((_data: Record<string, unknown>) => Promise.resolve({ id: 'sale-1' } as SaleRecord))
  mockRepo.createDetail.mockImplementation((_data: Record<string, unknown>) => Promise.resolve({ id: 'detail-1' }))
  mockRepo.createPayment.mockImplementation((_data: Record<string, unknown>) => Promise.resolve({ id: 'pay-1' }))
  mockRepo.recordPaymentTransactional.mockImplementation((_data: Record<string, unknown>) => Promise.resolve({ sale: { id: 'sale-1', paymentStatus: 'partial' }, payment: { id: 'pay-1' }, paidAmountCents: 4000 }))
  mockRepo.cancelTransactional.mockImplementation((_id: string, _createdBy: string) => Promise.resolve({ id: 'sale-1', saleStatus: 'cancelled' }))
  mockRepo.createTransactional.mockImplementation((_data: Record<string, unknown>) => Promise.resolve({ sale: { id: 'sale-1', subtotalCents: 33000, totalCents: 32500 }, details: [], totalCostCents: 26400 }))
})

describe('salesService.validateDozenQuantity', () => {
  test('acepta cantidades en unidades normales', () => {
    expect(salesService.validateDozenQuantity({ quantity: 3, pricingMode: 'unit' })).toBe(true)
  })

  test('acepta múltiplos de 12 cuando es docena', () => {
    expect(salesService.validateDozenQuantity({ quantity: 12, pricingMode: 'dozen' })).toBe(true)
  })

  test('rechaza cantidades no válidas para docena', () => {
    expect(salesService.validateDozenQuantity({ quantity: 10, pricingMode: 'dozen' })).toBe(false)
  })
})

describe('salesService.calculateSaleTotals', () => {
  test('calcula subtotal, descuento y total en centavos', () => {
    const totals = salesService.calculateSaleTotals({
      itemPriceCents: 4500,
      quantity: 3,
      discountCents: 500,
    })

    expect(totals).toEqual({ subtotalCents: 13500, discountCents: 500, totalCents: 13000 })
  })
})

describe('salesService.buildLineTotals', () => {
  test('mantiene la regla de docena y calcula el total correcto por pieza', () => {
    const result = salesService.buildLineTotals({
      product: { salePriceCents: 1800, dozenPriceCents: 20000 },
      quantity: 12,
      pricingMode: 'dozen',
      discountCents: 0,
    })

    expect(result).toEqual({
      unitPriceCents: 1667,
      subtotalCents: 20000,
      discountCents: 0,
      totalCents: 20000,
    })
  })

  test('rechaza solicitar más stock del disponible', () => {
    expect(() =>
      salesService.validateStockAvailability({
        requestedQuantity: 10,
        availableQuantity: 8,
      }),
    ).toThrow('stock')
  })
})

describe('salesService.allocateStockByFifo', () => {
  test('consume lotes en orden FIFO y calcula costo total', () => {
    const result = salesService.allocateStockByFifo({
      lots: [
        { quantityRemaining: 8, unitCostCents: 1200 },
        { quantityRemaining: 6, unitCostCents: 1400 },
      ],
      requestedQuantity: 10,
    })

    expect(result).toMatchObject({
      totalCostCents: 12400,
      remainingQuantity: 0,
      consumed: [
        { lotIndex: 0, quantity: 8, costCents: 9600 },
        { lotIndex: 1, quantity: 2, costCents: 2800 },
      ],
    })
  })
})

describe('salesService.buildSaleSummary', () => {
  test('calcula subtotal, costo, ganancia y total final con descuento', () => {
    const result = salesService.buildSaleSummary({
      items: [
        {
          product: { salePriceCents: 3000, dozenPriceCents: 33000 },
          quantity: 12,
          pricingMode: 'dozen',
          availableLots: [
            { quantityRemaining: 12, unitCostCents: 2200 },
          ],
        },
      ],
      discountCents: 500,
    })

    expect(result).toMatchObject({
      subtotalCents: 33000,
      totalDiscountCents: 500,
      totalCents: 32500,
      totalCostCents: 26400,
      grossProfitCents: 6100,
    })
  })
})

describe('salesService.createSale', () => {
  test('crea una venta con resumen, costo y pago inicial', async () => {
    mockRepo.create.mockReturnValueOnce(
      Promise.resolve({
        id: 'sale-1',
        subtotalCents: 33000,
        discountCents: 500,
        totalCents: 32500,
        totalCostCents: 26400,
        grossProfitCents: 6100,
        paymentStatus: 'partial',
        soldAt: new Date(),
        createdBy: 'user-1',
      } as SaleRecord),
    )

    const result = await salesService.createSale(
      {
        saleType: 'patio',
        items: [
          {
            productId: 'product-1',
            quantity: 12,
            pricingMode: 'dozen',
          },
        ],
        discountCents: 500,
        notes: 'Venta de prueba',
        initialPaymentCents: 10000,
      },
      'user-1',
    )

    expect(result.sale).toMatchObject({
      id: 'sale-1',
      subtotalCents: 33000,
      totalCents: 32500,
      paymentStatus: 'partial',
    })
    expect(mockRepo.createTransactional).toHaveBeenCalledTimes(1)
  })

  test('rechaza un pago inicial que excede el total', async () => {
    await expect(salesService.createSale({
      items: [{ productId: 'product-1', quantity: 1, pricingMode: 'unit' }],
      initialPaymentCents: 3001,
    }, 'user-1')).rejects.toThrow('superar')

    expect(mockRepo.createTransactional).not.toHaveBeenCalled()
  })

  test('marca una venta como completamente pagada cuando el pago cubre el total', async () => {
    mockRepo.createTransactional.mockReturnValueOnce(Promise.resolve({
      sale: { id: 'sale-1', totalCents: 3000, paymentStatus: 'paid' },
      details: [],
      totalCostCents: 0,
    }))

    const result = await salesService.createSale({
      items: [{ productId: 'product-1', quantity: 1, pricingMode: 'unit' }],
      initialPaymentCents: 3000,
    }, 'user-1')

    expect(result.sale).toMatchObject({ paymentStatus: 'paid', paidAmountCents: 3000 })
  })
})

describe('salesService.recordPayment', () => {
  test('rechaza pagos de ventas canceladas', async () => {
    mockRepo.findById.mockReturnValueOnce(Promise.resolve({ id: 'sale-1', saleStatus: 'cancelled', totalCents: 10000 }))

    await expect(salesService.recordPayment('sale-1', { amountCents: 1000, paymentMethod: 'cash' }, 'user-1'))
      .rejects.toThrow('venta cancelada')
    expect(mockRepo.recordPaymentTransactional).not.toHaveBeenCalled()
  })

  test('guarda un abono y marca la venta según monto pagado', async () => {
    mockRepo.findById.mockReturnValueOnce(
      Promise.resolve({
        id: 'sale-1',
        totalCents: 10000,
        paymentStatus: 'pending',
      }),
    )
    mockRepo.createPayment.mockReturnValueOnce(Promise.resolve({ id: 'pay-1' }))

    const result = await salesService.recordPayment('sale-1', { amountCents: 4000, paymentMethod: 'cash' }, 'user-1')

    expect(result.paymentStatus).toBe('partial')
    expect(result.paidAmountCents).toBe(4000)
    expect(mockRepo.recordPaymentTransactional).toHaveBeenCalledTimes(1)
  })

  test('reutiliza la clave de idempotencia del pago', async () => {
    mockRepo.findById.mockReturnValueOnce(Promise.resolve({ id: 'sale-1', totalCents: 10000, paymentStatus: 'pending' }))

    await salesService.recordPayment('sale-1', {
      amountCents: 4000,
      paymentMethod: 'cash',
      idempotencyKey: 'payment-unique-1',
    }, 'user-1')

    expect(mockRepo.recordPaymentTransactional).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: 'payment-unique-1',
    }))
  })
})

describe('salesService.cancel', () => {
  test('delega la cancelación transaccional al repositorio', async () => {
    mockRepo.findById.mockReturnValueOnce(Promise.resolve({ id: 'sale-1', saleStatus: 'active' }))

    await expect(salesService.cancel('sale-1', 'admin-1')).resolves.toMatchObject({ saleStatus: 'cancelled' })
    expect(mockRepo.cancelTransactional).toHaveBeenCalledWith('sale-1', 'admin-1')
  })
})
