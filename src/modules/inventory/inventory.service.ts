export const inventoryService = {
  calculateAvailableQuantity: (lots: Array<{ quantityRemaining: number }>) =>
    lots.reduce((sum, lot) => sum + Math.max(0, lot.quantityRemaining), 0),
}
