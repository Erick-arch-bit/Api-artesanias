import { t } from 'elysia'
import { paginationQuerySchema } from '../../shared/http/pagination'

const orderItemSchema = t.Object({
  productId: t.String({ format: 'uuid' }),
  quantity: t.Integer({ minimum: 1 }),
  pricingMode: t.Optional(t.Union([t.Literal('unit'), t.Literal('dozen')])),
})

export const createOrderSchema = t.Object({
  customerId: t.String({ format: 'uuid' }),
  orderChannel: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
  items: t.Array(orderItemSchema, { minItems: 1 }),
  discountCents: t.Optional(t.Integer({ minimum: 0 })),
  deliveryFeeCents: t.Optional(t.Integer({ minimum: 0 })),
  deliveryTransportCostCents: t.Optional(t.Integer({ minimum: 0 })),
  deliveryPackagingCostCents: t.Optional(t.Integer({ minimum: 0 })),
  otherDeliveryCostCents: t.Optional(t.Integer({ minimum: 0 })),
  initialPaymentCents: t.Optional(t.Integer({ minimum: 0 })),
  initialPaymentMethod: t.Optional(t.Union([
    t.Literal('cash'),
    t.Literal('transfer'),
    t.Literal('deposit'),
    t.Literal('other'),
  ])),
  deliveryDate: t.Optional(t.String()),
  deliveryTime: t.Optional(t.String({ maxLength: 20 })),
  deliveryPoint: t.Optional(t.String({ maxLength: 200 })),
  notes: t.Optional(t.String({ maxLength: 2000 })),
})

export const orderParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
})

export const ordersQuerySchema = paginationQuerySchema

export const updateOrderStatusSchema = t.Object({
  status: t.Union([
    t.Literal('confirmed'),
    t.Literal('preparing'),
    t.Literal('ready'),
    t.Literal('delivered'),
    t.Literal('cancelled'),
  ]),
})

export const orderPaymentSchema = t.Object({
  amountCents: t.Integer({ minimum: 1 }),
  paymentMethod: t.Union([
    t.Literal('cash'),
    t.Literal('transfer'),
    t.Literal('deposit'),
    t.Literal('other'),
  ]),
  idempotencyKey: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
})

export const deliverySchema = t.Object({
  deliveryDate: t.String(),
  deliveryPoint: t.String({ minLength: 1, maxLength: 200 }),
  deliveryTime: t.Optional(t.String({ maxLength: 20 })),
  deliveryTransportCostCents: t.Optional(t.Integer({ minimum: 0 })),
  deliveryPackagingCostCents: t.Optional(t.Integer({ minimum: 0 })),
  otherDeliveryCostCents: t.Optional(t.Integer({ minimum: 0 })),
})
