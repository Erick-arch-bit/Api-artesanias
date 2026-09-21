import { t } from 'elysia'

export const createProductSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 150 }),
  categoryId: t.String({ format: 'uuid' }),
  description: t.Optional(t.String({ maxLength: 1000 })),
  imageUrl: t.Optional(t.String({ maxLength: 2000 })),
  salePrice: t.Number({ minimum: 0 }),
  dozenPrice: t.Optional(t.Number({ minimum: 0 })),
  costPrice: t.Number({ minimum: 0 }),
  stockQuantity: t.Integer({ minimum: 0 }),
  minimumStock: t.Integer({ minimum: 0 }),
})

export const updateProductSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 150 }),
  categoryId: t.String({ format: 'uuid' }),
  description: t.Optional(t.String({ maxLength: 1000 })),
  imageUrl: t.Optional(t.String({ maxLength: 2000 })),
  salePrice: t.Number({ minimum: 0 }),
  dozenPrice: t.Optional(t.Number({ minimum: 0 })),
  costPrice: t.Number({ minimum: 0 }),
  minimumStock: t.Integer({ minimum: 0 }),
})

export const setActiveProductSchema = t.Object({
  active: t.Boolean(),
})

export const productParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
})

export const productQuerySchema = t.Object({
  categoryId: t.Optional(t.String({ format: 'uuid' })),
  search: t.Optional(t.String({ maxLength: 150 })),
  page: t.Optional(t.Integer({ minimum: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
})

export const deleteProductQuerySchema = t.Object({
  confirm: t.Optional(t.String()),
})
