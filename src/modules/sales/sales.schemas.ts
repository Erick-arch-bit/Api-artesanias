import { t } from 'elysia'
import { paginationQuerySchema } from '../../shared/http/pagination'

const saleItemSchema = t.Object({
  productId: t.String({ format: 'uuid' }),
  quantity: t.Integer({ minimum: 1 }),
  pricingMode: t.Union([t.Literal('unit'), t.Literal('dozen')]),
})

export const createSaleSchema = t.Object({
  saleType: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
  items: t.Array(saleItemSchema, { minItems: 1 }),
  discountCents: t.Optional(t.Integer({ minimum: 0 })),
  notes: t.Optional(t.String({ maxLength: 2000 })),
  initialPaymentCents: t.Optional(t.Integer({ minimum: 0 })),
})

export const saleParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
})

export const salesQuerySchema = paginationQuerySchema

export const createPaymentSchema = t.Object({
  amountCents: t.Integer({ minimum: 1 }),
  paymentMethod: t.Union([
    t.Literal('cash'),
    t.Literal('transfer'),
    t.Literal('deposit'),
    t.Literal('other'),
  ]),
  idempotencyKey: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
})
