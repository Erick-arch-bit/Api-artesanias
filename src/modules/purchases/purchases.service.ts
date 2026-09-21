import { createRegisterPurchaseUseCase, distributePurchaseExtraCosts } from './application/register-purchase'
import type { RegisterPurchaseInput } from './application/purchase.ports'
import { purchaseDrizzleAdapter } from './adapters/purchase.drizzle-adapter'

export const purchasesService = {
  distributeExtraCosts: distributePurchaseExtraCosts,

  createPurchase: (payload: RegisterPurchaseInput) =>
    createRegisterPurchaseUseCase(purchaseDrizzleAdapter)(payload),
}
