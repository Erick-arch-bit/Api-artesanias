import { eq } from 'drizzle-orm'
import { db } from '../../database/client'
import { users } from '../../database/schema'

export const authRepository = {
  findByEmail: async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email))
    return user
  },

  findById: async (id: string) => {
    const [user] = await db.select().from(users).where(eq(users.id, id))
    return user
  },

  create: async (data: {
    name: string
    email: string
    passwordHash: string
    role: string
  }) => {
    const [user] = await db.insert(users).values(data).returning()
    return user
  },
}
