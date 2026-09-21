import { t } from 'elysia'
import { paginationQuerySchema } from '../../shared/http/pagination'

export const inventoryQuerySchema = t.Object({
  lowStock: t.Optional(t.Boolean()),
})

export const inventoryMovementsQuerySchema = t.Composite([
  paginationQuerySchema,
  t.Object({
    productId: t.Optional(t.String({ format: 'uuid' })),
    movementType: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
    referenceType: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  }),
])
