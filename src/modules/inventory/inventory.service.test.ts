import { describe, expect, test } from 'bun:test'
import { inventoryService } from './inventory.service'

describe('inventoryService.calculateAvailableQuantity', () => {
  test('suma el stock disponible por lote y descarta cantidades negativas', () => {
    expect(inventoryService.calculateAvailableQuantity([{ quantityRemaining: 12 }, { quantityRemaining: 8 }, { quantityRemaining: 0 }])).toBe(20)
  })

  test('devuelve 0 cuando no hay lotes', () => {
    expect(inventoryService.calculateAvailableQuantity([])).toBe(0)
  })
})
