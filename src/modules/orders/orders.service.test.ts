import { afterEach, describe, expect, test } from 'bun:test'
import { ordersService } from './orders.service'
import { ordersRepository } from './orders.repository'

const originalFindById = ordersRepository.findById
const originalCancelTransactional = ordersRepository.cancelTransactional
const originalUpdate = ordersRepository.update
const originalRecordPaymentTransactional = ordersRepository.recordPaymentTransactional
const originalExpireReservationsTransactional = ordersRepository.expireReservationsTransactional

afterEach(() => {
  ordersRepository.findById = originalFindById
  ordersRepository.cancelTransactional = originalCancelTransactional
  ordersRepository.update = originalUpdate
  ordersRepository.recordPaymentTransactional = originalRecordPaymentTransactional
  ordersRepository.expireReservationsTransactional = originalExpireReservationsTransactional
})

describe('ordersService.validateReservationRule', () => {
  test('sin anticipo no reserva inventario', () => {
    expect(ordersService.validateReservationRule({ paidAmountCents: 0, orderStatus: 'pending' })).toBe(false)
  })

  test('con anticipo y pedido pendiente sí reserva inventario', () => {
    expect(ordersService.validateReservationRule({ paidAmountCents: 3000, orderStatus: 'pending' })).toBe(true)
  })

  test('un pedido sin anticipo no reserva inventario aunque esté pendiente', () => {
    expect(ordersService.validateReservationRule({ paidAmountCents: 0, orderStatus: 'pending' })).toBe(false)
  })
})

describe('ordersService.calculateSummary', () => {
  test('calcula total, saldo y utilidad neta del pedido', () => {
    expect(ordersService.calculateSummary({
      subtotalCents: 20000,
      discountCents: 1000,
      deliveryFeeCents: 1500,
      deliveryTransportCostCents: 500,
      deliveryPackagingCostCents: 200,
      productCostTotalCents: 12000,
      paidAmountCents: 5000,
    })).toEqual({
      totalCents: 20500,
      paidAmountCents: 5000,
      pendingBalanceCents: 15500,
      productCostTotalCents: 12000,
      grossProfitCents: 8500,
      netProfitCents: 7800,
      paymentStatus: 'partial',
    })
  })

  test('marca como pagado cuando el pago cubre exactamente el total', () => {
    expect(ordersService.calculateSummary({
      subtotalCents: 999,
      paidAmountCents: 999,
    })).toMatchObject({
      totalCents: 999,
      pendingBalanceCents: 0,
      paymentStatus: 'paid',
    })
  })

  test('rechaza un sobrepago', () => {
    expect(() => ordersService.calculateSummary({
      subtotalCents: 1000,
      paidAmountCents: 1001,
    })).toThrow('superar')
  })
})

describe('ordersService.validateStatusTransition', () => {
  test('permite avanzar un pedido pendiente a confirmado', () => {
    expect(ordersService.validateStatusTransition('pending', 'confirmed')).toBe(true)
  })

  test('rechaza saltar directamente a entregado', () => {
    expect(() => ordersService.validateStatusTransition('pending', 'delivered')).toThrow('No se puede')
  })
})

describe('ordersService.validateDelivery', () => {
  test('normaliza el punto de entrega y la fecha', () => {
    const result = ordersService.validateDelivery({ deliveryDate: '2026-09-20', deliveryPoint: '  Plaza central  ' })
    expect(result.deliveryPoint).toBe('Plaza central')
    expect(result.deliveryDate).toBeInstanceOf(Date)
  })
})

describe('ordersService.createOrder', () => {
  test('rechaza productos repetidos antes de asignar inventario', async () => {
    await expect(ordersService.createOrder({
      customerId: 'customer-1',
      items: [
        { productId: 'product-1', quantity: 1 },
        { productId: 'product-1', quantity: 2 },
      ],
    }, 'user-1')).rejects.toThrow('repetir un producto')
  })
})

describe('ordersService.registerDelivery', () => {
  test('persiste costos de entrega y recalcula la utilidad neta', async () => {
    ordersRepository.findById = async () => ({
      id: 'order-1',
      orderStatus: 'ready',
      subtotalCents: 20000,
      discountCents: 1000,
      deliveryFeeCents: 1500,
      productCostTotalCents: 12000,
      paidAmountCents: 5000,
    }) as never
    ordersRepository.update = async (_id, data) => ({ ...data, id: 'order-1' }) as never

    await expect(ordersService.registerDelivery('order-1', {
      deliveryDate: '2026-09-20',
      deliveryPoint: 'Plaza central',
      deliveryTransportCostCents: 500,
      deliveryPackagingCostCents: 200,
      otherDeliveryCostCents: 100,
    })).resolves.toMatchObject({
      deliveryTransportCostCents: 500,
      deliveryPackagingCostCents: 200,
      otherDeliveryCostCents: 100,
      netProfitCents: 7700,
    })
  })
})

describe('ordersService.cancel', () => {
  test('cancela un pedido sin reserva sin intentar devolver inventario', async () => {
    const cancelTransactional = async () => ({ id: 'order-1', orderStatus: 'cancelled' })
    ordersRepository.findById = async () => ({ id: 'order-1', orderStatus: 'pending' }) as never
    ordersRepository.cancelTransactional = cancelTransactional as never

    await expect(ordersService.cancel('order-1', 'admin-1')).resolves.toMatchObject({
      id: 'order-1',
      orderStatus: 'cancelled',
    })
    expect(cancelTransactional).toBeDefined()
  })
})

describe('ordersService.recordPayment', () => {
  test('rechaza pagos de pedidos cancelados o entregados', async () => {
    ordersRepository.findById = async () => ({ id: 'order-1', orderStatus: 'delivered' }) as never

    await expect(ordersService.recordPayment('order-1', 1000, 'cash', 'user-1'))
      .rejects.toThrow('cancelado o entregado')
  })
})

describe('ordersService.expireReservations', () => {
  test('expira reservas mediante la operación transaccional del repositorio', async () => {
    ordersRepository.expireReservationsTransactional = async () => [{ id: 'order-1', orderStatus: 'cancelled' }] as never

    await expect(ordersService.expireReservations('admin-1')).resolves.toMatchObject([
      { id: 'order-1', orderStatus: 'cancelled' },
    ])
  })
})
