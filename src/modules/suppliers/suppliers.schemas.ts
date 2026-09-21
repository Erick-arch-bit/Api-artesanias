import { t } from 'elysia'

export const createSupplierSchema = t.Object({
  name: t.String({ minLength: 2, maxLength: 150 }),
  city: t.String({ minLength: 2, maxLength: 120 }),
  phone: t.Optional(t.String({ maxLength: 30 })),
  notes: t.Optional(t.String({ maxLength: 1000 })),
})

export const updateSupplierSchema = t.Partial(t.Object({
  name: t.String({ minLength: 2, maxLength: 150 }),
  city: t.String({ minLength: 2, maxLength: 120 }),
  phone: t.String({ maxLength: 30 }),
  notes: t.String({ maxLength: 1000 }),
  active: t.Boolean(),
}))

export const supplierParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
})
