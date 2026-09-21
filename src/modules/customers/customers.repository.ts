import { asc, eq } from 'drizzle-orm'
import { db } from '../../database/client'
import { customers } from '../../database/schema'

export const customersRepository = {
  findAll: async () => db.select().from(customers).orderBy(asc(customers.name)),

  findById: async (id: string) => {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id))
    return customer
  },

  create: async (data: typeof customers.$inferInsert) => {
    const [customer] = await db.insert(customers).values(data).returning()
    return customer
  },

  update: async (id: string, data: Partial<typeof customers.$inferInsert>) => {
    const [customer] = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning()
    return customer
  },
}
