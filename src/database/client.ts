import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('Falta la variable DATABASE_URL en el archivo .env')
}

const queryClient = postgres(databaseUrl, {
  prepare: false,
})

export const db = drizzle(queryClient)
