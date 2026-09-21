import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { env } from '../config/env'

const queryClient = postgres(env.DATABASE_URL, {
  prepare: false,
  ssl: env.DATABASE_SSL === 'require' ? 'require' : false,
  connect_timeout: 10,
})

export const db = drizzle(queryClient)

export async function checkDatabaseConnection(): Promise<void> {
  await queryClient`select 1 as ok`
}
