import { and, asc, count, desc, eq, isNull, sum, type SQL } from 'drizzle-orm'
import { db } from '../../database/client'
import { inventoryMovements, products, purchaseDetails } from '../../database/schema'
import { getPagination, type PaginationInput } from '../../shared/http/pagination'

export const inventoryRepository = {
  findAll: async () => {
    const [rows, adjustments] = await Promise.all([db
      .select({
        product: products,
        lot: purchaseDetails,
      })
      .from(products)
      .leftJoin(purchaseDetails, eq(products.id, purchaseDetails.productId))
      .orderBy(asc(products.name), asc(purchaseDetails.createdAt)),
      db.select({ productId: inventoryMovements.productId, quantity: sum(inventoryMovements.quantity) })
        .from(inventoryMovements)
        .where(and(eq(inventoryMovements.movementType, 'adjustment'), isNull(inventoryMovements.purchaseDetailId)))
        .groupBy(inventoryMovements.productId)])

    const adjustmentByProduct = new Map(adjustments.map((row) => [row.productId, Number(row.quantity ?? 0)]))

    const inventory = new Map<string, {
      id: string
      name: string
      minimumStock: number
      active: boolean
      currentStock: number
      inventoryValueCents: number
      lots: Array<{ id: string; quantityRemaining: number; realUnitCostCents: number }>
    }>()

    for (const row of rows) {
      const existing = inventory.get(row.product.id) ?? {
        id: row.product.id,
        name: row.product.name,
        minimumStock: row.product.minimumStock,
        active: row.product.active,
        currentStock: 0,
        inventoryValueCents: 0,
        lots: [],
      }

      if (!inventory.has(row.product.id)) {
        existing.currentStock += adjustmentByProduct.get(row.product.id) ?? 0
        existing.inventoryValueCents += (adjustmentByProduct.get(row.product.id) ?? 0) * row.product.costPriceCents
      }

      if (row.lot && row.lot.quantityRemaining > 0) {
        existing.currentStock += row.lot.quantityRemaining
        existing.inventoryValueCents += row.lot.quantityRemaining * row.lot.realUnitCostCents
        existing.lots.push({
          id: row.lot.id,
          quantityRemaining: row.lot.quantityRemaining,
          realUnitCostCents: row.lot.realUnitCostCents,
        })
      }

      inventory.set(row.product.id, existing)
    }

    return [...inventory.values()]
  },

  findMovements: async (filters: { productId?: string; movementType?: string; referenceType?: string } = {}, pagination: PaginationInput = {}) => {
    const conditions: SQL[] = []
    if (filters.productId) conditions.push(eq(inventoryMovements.productId, filters.productId))
    if (filters.movementType) conditions.push(eq(inventoryMovements.movementType, filters.movementType))
    if (filters.referenceType) conditions.push(eq(inventoryMovements.referenceType, filters.referenceType))
    const where = conditions.length ? and(...conditions) : undefined
    const { limit, offset } = getPagination(pagination)
    const [items, countRows] = await Promise.all([
      db.select().from(inventoryMovements).where(where).orderBy(desc(inventoryMovements.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(inventoryMovements).where(where),
    ])
    return { items, total: Number(countRows[0]?.total ?? 0) }
  },
}
