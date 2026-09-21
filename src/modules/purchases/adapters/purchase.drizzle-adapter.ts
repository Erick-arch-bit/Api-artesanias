import { purchasesRepository } from '../purchases.repository'
import type { PurchasePersistencePort } from '../application/purchase.ports'

/** Adaptador de salida: traduce el puerto del caso de uso a Drizzle/PostgreSQL. */
export const purchaseDrizzleAdapter: PurchasePersistencePort = {
  createWithInventory: (input) => purchasesRepository.createWithInventory(input),
}