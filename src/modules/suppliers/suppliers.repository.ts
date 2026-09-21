import { asc, eq } from 'drizzle-orm'
import { db } from '../../database/client'
import { suppliers } from '../../database/schema'

export const suppliersRepository = {
  findAll: async () => db.select().from(suppliers).orderBy(asc(suppliers.name)),

  findById: async (id: string) => {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id))
    return supplier
  },

  create: async (data: typeof suppliers.$inferInsert) => {
    const [supplier] = await db.insert(suppliers).values(data).returning()
    return supplier
  },

  update: async (id: string, data: Partial<typeof suppliers.$inferInsert>) => {
    const [supplier] = await db
      .update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning()
    return supplier
  },
}
