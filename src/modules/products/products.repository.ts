import { eq, and, ilike, count, type SQL } from 'drizzle-orm'
import { db } from '../../database/client'
import { inventoryMovements, products, purchaseDetails } from '../../database/schema'
import { getPagination, type PaginationInput } from '../../shared/http/pagination'

export const productsRepository = {
  findActive: async (pagination: PaginationInput = {}) => {
    const { limit, offset } = getPagination(pagination)
    const [items, countRows] = await Promise.all([
      db.select().from(products).where(eq(products.active, true)).limit(limit).offset(offset),
      db.select({ total: count() }).from(products).where(eq(products.active, true)),
    ])
    return { items, total: Number(countRows[0]?.total ?? 0) }
  },

  findActiveByCategoryId: (categoryId: string) =>
    db
      .select()
      .from(products)
      .where(and(eq(products.active, true), eq(products.categoryId, categoryId))),

  findActiveByFilters: async (filters: { categoryId?: string; search?: string }, pagination: PaginationInput = {}) => {
    const conditions: SQL[] = [eq(products.active, true)]
    if (filters.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId))
    }
    const search = filters.search?.trim()
    if (search) {
      conditions.push(ilike(products.name, `%${search}%`))
    }
    const { limit, offset } = getPagination(pagination)
    const where = and(...conditions)
    const [items, countRows] = await Promise.all([
      db.select().from(products).where(where).limit(limit).offset(offset),
      db.select({ total: count() }).from(products).where(where),
    ])
    return { items, total: Number(countRows[0]?.total ?? 0) }
  },

  findById: async (id: string) => {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
    return product
  },

  create: async (data: typeof products.$inferInsert) => {
    const [product] = await db.insert(products).values(data).returning()
    return product
  },

  createWithInitialStock: async (data: {
    product: typeof products.$inferInsert
    stockQuantity: number
    createdBy?: string
  }) => db.transaction(async (tx) => {
    const [product] = await tx.insert(products).values(data.product).returning()
    if (!product) throw new Error('No se pudo crear el producto.')
    if (data.stockQuantity > 0) {
      const [initialLot] = await tx.insert(purchaseDetails).values({
        purchaseId: null,
        productId: product.id,
        quantityReceived: data.stockQuantity,
        quantityRemaining: data.stockQuantity,
        supplierUnitCostCents: product.costPriceCents,
        realUnitCostCents: product.costPriceCents,
        costRemainingCents: data.stockQuantity * product.costPriceCents,
      }).returning()
      if (!initialLot) throw new Error('No se pudo crear el lote inicial del producto.')
      await tx.insert(inventoryMovements).values({
        productId: product.id,
        purchaseDetailId: initialLot.id,
        movementType: 'adjustment',
        quantity: data.stockQuantity,
        movementDate: new Date(),
        referenceType: 'product',
        referenceId: product.id,
        notes: 'Stock inicial del producto',
        createdBy: data.createdBy,
      })
    }
    return product
  }),

  update: async (id: string, data: Partial<typeof products.$inferInsert>) => {
    const [product] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning()
    return product
  },
}
