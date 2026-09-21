import { t } from 'elysia'
import { paginationQuerySchema } from '../../shared/http/pagination'

export const purchaseItemSchema = t.Object({
  productId: t.String({ format: 'uuid' }),
  quantity: t.Integer({ minimum: 1 }),
  supplierUnitCostCents: t.Integer({ minimum: 0 }),
})

export const createPurchaseSchema = t.Object({
  supplierId: t.String({ format: 'uuid' }),
  purchaseDate: t.String({ format: 'date-time' }),
  costs: t.Object({
    transportCents: t.Optional(t.Integer({ minimum: 0 })),
    loadingCents: t.Optional(t.Integer({ minimum: 0 })),
    packagingCents: t.Optional(t.Integer({ minimum: 0 })),
    foodCents: t.Optional(t.Integer({ minimum: 0 })),
    otherCents: t.Optional(t.Integer({ minimum: 0 })),
  }),
  notes: t.Optional(t.String({ maxLength: 2000 })),
  items: t.Array(purchaseItemSchema),
})

export const purchaseParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
})

export const purchasesQuerySchema = paginationQuerySchema
