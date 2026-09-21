import { describe, expect, test } from 'bun:test'
import { createRegisterPurchaseUseCase } from './application/register-purchase'
import { purchasesService } from './purchases.service'

describe('purchasesService.distributeExtraCosts', () => {
  test('distribuye gastos extra sin perder centavos y en orden estable', () => {
    const allocations = purchasesService.distributeExtraCosts(1250, [60, 24])

    expect(allocations).toEqual([900, 350])
    expect(allocations.reduce((sum, value) => sum + value, 0)).toBe(1250)
  })

  test('devuelve ceros cuando no hay piezas', () => {
    expect(purchasesService.distributeExtraCosts(500, [0, 0])).toEqual([0, 0])
  })
})

describe('createRegisterPurchaseUseCase', () => {
  test('calcula la inversión y entrega datos completos al puerto transaccional', async () => {
    let persisted: Record<string, unknown> | undefined
    const useCase = createRegisterPurchaseUseCase({
      createWithInventory: async (input) => {
        persisted = input
        return { id: 'purchase-1' }
      },
    })

    const result = await useCase({
      supplierId: 'supplier-1',
      purchaseDate: '2026-09-19T12:00:00.000Z',
      costs: { transportCents: 70000, loadingCents: 25000, packagingCents: 12000, foodCents: 18000 },
      items: [
        { productId: 'product-1', quantity: 60, supplierUnitCostCents: 1600 },
        { productId: 'product-2', quantity: 24, supplierUnitCostCents: 4200 },
      ],
      createdBy: 'user-1',
    })

    expect(result).toEqual({ id: 'purchase-1' })
    expect(persisted).toMatchObject({
      purchase: {
        merchandiseTotalCents: 196800,
        extraCostTotalCents: 125000,
        totalInvestmentCents: 321800,
      },
      details: [
        { productId: 'product-1', quantityReceived: 60, quantityRemaining: 60, allocatedExtraCostCents: 89288, costRemainingCents: 185288 },
        { productId: 'product-2', quantityReceived: 24, quantityRemaining: 24, allocatedExtraCostCents: 35712, costRemainingCents: 136512 },
      ],
    })

    const details = (persisted as { details: Array<{ costRemainingCents: number }> }).details
    expect(details.reduce((sum, detail) => sum + detail.costRemainingCents, 0)).toBe(321800)
  })

  test('rechaza costos extra negativos antes de tocar persistencia', async () => {
    const createWithInventory = async () => ({ id: 'must-not-persist' })
    const useCase = createRegisterPurchaseUseCase({ createWithInventory })

    await expect(useCase({
      supplierId: 'supplier-1',
      purchaseDate: '2026-09-19',
      costs: { transportCents: -1 },
      items: [{ productId: 'product-1', quantity: 1, supplierUnitCostCents: 100 }],
      createdBy: 'user-1',
    })).rejects.toThrow('costos extra')
  })
})
