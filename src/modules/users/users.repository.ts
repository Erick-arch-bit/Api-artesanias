import { asc, eq, sql } from 'drizzle-orm'
import { db } from '../../database/client'
import { users } from '../../database/schema'

export const usersRepository = {
  findAll: async () => db.select().from(users).orderBy(asc(users.name)),

  findById: async (id: string) => {
    const [user] = await db.select().from(users).where(eq(users.id, id))
    return user
  },

  findByEmail: async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email))
    return user
  },

  create: async (data: typeof users.$inferInsert) => {
    const [user] = await db.insert(users).values(data).returning()
    return user
  },

  update: async (id: string, data: Partial<typeof users.$inferInsert>) => {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    return user
  },

  incrementTokenVersion: async (id: string) => db.transaction(async (tx) => {
    const [user] = await tx.update(users)
      .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    return user
  }),
}
