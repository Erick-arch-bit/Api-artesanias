import { asc, count, eq } from 'drizzle-orm'
import { db } from '../../database/client'
import { inventoryMovements, purchaseDetails, purchases } from '../../database/schema'
import { getPagination, type PaginationInput } from '../../shared/http/pagination'

export const purchasesRepository = {
  findAll: async (pagination: PaginationInput = {}) => {
    const { limit, offset } = getPagination(pagination)
    const [items, countRows] = await Promise.all([
      db.select().from(purchases).orderBy(asc(purchases.purchaseDate)).limit(limit).offset(offset),
      db.select({ total: count() }).from(purchases),
    ])
    return { items, total: Number(countRows[0]?.total ?? 0) }
  },

  findById: async (id: string) => {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id))
    return purchase
  },

  create: async (data: typeof purchases.$inferInsert) => {
    const [purchase] = await db.insert(purchases).values(data).returning()
    return purchase
  },

  createDetail: async (data: typeof purchaseDetails.$inferInsert) => {
    const [detail] = await db.insert(purchaseDetails).values(data).returning()
    return detail
  },

  createWithInventory: async (data: {
    purchase: typeof purchases.$inferInsert
    details: Array<Omit<typeof purchaseDetails.$inferInsert, 'purchaseId'>>
    createdBy: string
  }) => db.transaction(async (tx) => {
    const [purchase] = await tx.insert(purchases).values(data.purchase).returning()
    if (!purchase) return undefined

    const createdDetails = [] as Array<typeof purchaseDetails.$inferSelect>
    for (const detailData of data.details) {
      const [detail] = await tx.insert(purchaseDetails).values({ ...detailData, purchaseId: purchase.id }).returning()
      if (!detail) throw new Error('No se pudo registrar el lote del surtido.')
      createdDetails.push(detail)

      await tx.insert(inventoryMovements).values({
        productId: detail.productId,
        purchaseDetailId: detail.id,
        movementType: 'purchase_entry',
        quantity: detail.quantityReceived,
        movementDate: new Date(),
        referenceType: 'purchase',
        referenceId: purchase.id,
        notes: 'Entrada por surtido de Puebla',
        createdBy: data.createdBy,
      })
    }

    return { purchase, details: createdDetails }
  }),

  findDetailsByPurchaseId: async (purchaseId: string) =>
    db.select().from(purchaseDetails).where(eq(purchaseDetails.purchaseId, purchaseId)).orderBy(asc(purchaseDetails.createdAt)),
}
