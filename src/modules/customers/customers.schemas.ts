import { t } from 'elysia'

export const createCustomerSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 150 }),
  phone: t.String({ minLength: 1, maxLength: 30 }),
  neighborhood: t.Optional(t.String({ maxLength: 120 })),
  frequentDeliveryPoint: t.Optional(t.String({ maxLength: 200 })),
  notes: t.Optional(t.String()),
})

export const updateCustomerSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 150 })),
  phone: t.Optional(t.String({ minLength: 1, maxLength: 30 })),
  neighborhood: t.Optional(t.String({ maxLength: 120 })),
  frequentDeliveryPoint: t.Optional(t.String({ maxLength: 200 })),
  notes: t.Optional(t.String()),
  active: t.Optional(t.Boolean()),
})

export const customerParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
})
