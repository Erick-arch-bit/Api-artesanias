import { checkDatabaseConnection } from './client'

try {
  await checkDatabaseConnection()
  console.log('Conexión a PostgreSQL correcta.')
  process.exit(0)
} catch (error) {
  console.error('No se pudo conectar a PostgreSQL.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}