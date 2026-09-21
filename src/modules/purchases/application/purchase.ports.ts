export type PurchaseItemInput = {
  productId: string
  quantity: number
  supplierUnitCostCents: number
}

export type PurchaseCosts = {
  transportCents?: number
  loadingCents?: number
  packagingCents?: number
  foodCents?: number
  otherCents?: number
}

export type RegisterPurchaseInput = {
  supplierId: string
  purchaseDate: Date | string
  costs: PurchaseCosts
  notes?: string | null
  items: PurchaseItemInput[]
  createdBy: string
}

export type PurchaseDetailToPersist = {
  productId: string
  quantityReceived: number
  quantityRemaining: number
  supplierUnitCostCents: number
  allocatedExtraCostCents: number
  realUnitCostCents: number
  costRemainingCents: number
}

export type PurchaseToPersist = {
  supplierId: string
  purchaseDate: Date
  transportCostCents: number
  loadingCostCents: number
  packagingCostCents: number
  foodCostCents: number
  otherCostCents: number
  merchandiseTotalCents: number
  extraCostTotalCents: number
  totalInvestmentCents: number
  notes: string | null
  createdBy: string
}

export interface PurchasePersistencePort {
  createWithInventory(input: {
    purchase: PurchaseToPersist
    details: PurchaseDetailToPersist[]
    createdBy: string
  }): Promise<unknown>
}