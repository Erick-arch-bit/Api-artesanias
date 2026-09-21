import { t } from 'elysia'

export const createUserSchema = t.Object({
  name: t.String({ minLength: 2, maxLength: 120 }),
  email: t.String({ format: 'email', minLength: 5, maxLength: 255 }),
  password: t.String({ minLength: 8, maxLength: 200 }),
  role: t.Optional(t.Union([t.Literal('admin'), t.Literal('seller'), t.Literal('family')])),
})

export const updateUserSchema = t.Partial(t.Object({
  name: t.String({ minLength: 2, maxLength: 120 }),
  email: t.String({ format: 'email', minLength: 5, maxLength: 255 }),
  role: t.Union([t.Literal('admin'), t.Literal('seller'), t.Literal('family')]),
  active: t.Boolean(),
}))

export const setUserStatusSchema = t.Object({
  active: t.Boolean(),
})

export const userParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
})
