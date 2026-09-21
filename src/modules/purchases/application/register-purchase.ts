import { AppError } from '../../../shared/errors/app-error'
import type {
  PurchaseDetailToPersist,
  PurchaseItemInput,
  PurchasePersistencePort,
  RegisterPurchaseInput,
} from './purchase.ports'

export function distributePurchaseExtraCosts(extraCostCents: number, quantities: number[]): number[] {
  const validQuantities = quantities.filter((quantity) => quantity > 0)
  if (validQuantities.length === 0 || extraCostCents <= 0) return quantities.map(() => 0)

  const totalQuantity = validQuantities.reduce((sum, quantity) => sum + quantity, 0)
  const baseAllocation = Math.floor(extraCostCents / totalQuantity)
  let remainder = extraCostCents % totalQuantity
  const allocations = quantities.map((quantity) => (quantity > 0 ? baseAllocation * quantity : 0))

  for (let index = 0; index < quantities.length && remainder > 0; index += 1) {
    const quantity = quantities[index] ?? 0
    if (quantity <= 0) continue
    const unitsToAssign = Math.min(quantity, remainder)
    allocations[index] = (allocations[index] ?? 0) + unitsToAssign
    remainder -= unitsToAssign
  }

  return allocations
}

function validatePurchaseItem(item: PurchaseItemInput): void {
  if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
    throw AppError.validation('La cantidad de cada producto debe ser un entero positivo.')
  }
  if (!Number.isInteger(item.supplierUnitCostCents) || item.supplierUnitCostCents < 0) {
    throw AppError.validation('El costo unitario del proveedor debe ser un entero válido.')
  }
}

export function createRegisterPurchaseUseCase(persistence: PurchasePersistencePort) {
  return async (input: RegisterPurchaseInput) => {
    if (!input.items.length) {
      throw AppError.validation('Debes incluir al menos un producto en el surtido.')
    }

    const purchaseDate = new Date(input.purchaseDate)
    if (Number.isNaN(purchaseDate.getTime())) {
      throw AppError.validation('La fecha del surtido no es válida.')
    }

    input.items.forEach(validatePurchaseItem)
    const costs = {
      transportCents: input.costs.transportCents ?? 0,
      loadingCents: input.costs.loadingCents ?? 0,
      packagingCents: input.costs.packagingCents ?? 0,
      foodCents: input.costs.foodCents ?? 0,
      otherCents: input.costs.otherCents ?? 0,
    }
    if (Object.values(costs).some((cost) => !Number.isInteger(cost) || cost < 0)) {
      throw AppError.validation('Los costos extra del surtido deben ser enteros no negativos.')
    }

    const merchandiseTotalCents = input.items.reduce(
      (total, item) => total + item.quantity * item.supplierUnitCostCents,
      0,
    )
    const extraCostTotalCents = Object.values(costs).reduce((total, cost) => total + cost, 0)
    const allocations = distributePurchaseExtraCosts(
      extraCostTotalCents,
      input.items.map((item) => item.quantity),
    )
    const details: PurchaseDetailToPersist[] = input.items.map((item, index) => {
      const allocatedExtraCostCents = allocations[index] ?? 0
      return {
        productId: item.productId,
        quantityReceived: item.quantity,
        quantityRemaining: item.quantity,
        supplierUnitCostCents: item.supplierUnitCostCents,
        allocatedExtraCostCents,
        realUnitCostCents: item.supplierUnitCostCents + Math.floor(allocatedExtraCostCents / item.quantity),
        costRemainingCents: item.quantity * item.supplierUnitCostCents + allocatedExtraCostCents,
      }
    })

    return persistence.createWithInventory({
      purchase: {
        supplierId: input.supplierId,
        purchaseDate,
        transportCostCents: costs.transportCents,
        loadingCostCents: costs.loadingCents,
        packagingCostCents: costs.packagingCents,
        foodCostCents: costs.foodCents,
        otherCostCents: costs.otherCents,
        merchandiseTotalCents,
        extraCostTotalCents,
        totalInvestmentCents: merchandiseTotalCents + extraCostTotalCents,
        notes: input.notes?.trim() || null,
        createdBy: input.createdBy,
      },
      details,
      createdBy: input.createdBy,
    })
  }
}