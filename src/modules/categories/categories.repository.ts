import { eq, ilike, sql, and } from 'drizzle-orm'
import { db } from '../../database/client'
import { categories } from '../../database/schema'

export const categoriesRepository = {
  findActive: () =>
    db.select().from(categories).where(eq(categories.active, true)),

  findAll: () => db.select().from(categories),

  findById: async (id: string) => {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
    return category
  },

  findByName: async (name: string) => {
    const [category] = await db
      .select()
      .from(categories)
      .where(ilike(categories.name, name))
    return category
  },

  findByNameExcludingId: async (name: string, excludeId: string) => {
    const [category] = await db
      .select()
      .from(categories)
      .where(
        and(ilike(categories.name, name), sql`${categories.id} != ${excludeId}`),
      )
    return category
  },

  create: async (name: string) => {
    const [category] = await db
      .insert(categories)
      .values({ name })
      .returning()
    return category
  },

  update: async (id: string, data: { name: string }) => {
    const [category] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning()
    return category
  },

  setActive: async (id: string, active: boolean) => {
    const [category] = await db
      .update(categories)
      .set({ active, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning()
    return category
  },
}
