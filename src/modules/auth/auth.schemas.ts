import { t } from 'elysia'

export const registerSchema = t.Object({
  name: t.String({ minLength: 2, maxLength: 120 }),
  email: t.String({ format: 'email', minLength: 5, maxLength: 255 }),
  password: t.String({ minLength: 8, maxLength: 200 }),
})

export const loginSchema = t.Object({
  email: t.String({ format: 'email', minLength: 5, maxLength: 255 }),
  password: t.String({ minLength: 8, maxLength: 200 }),
})

export const authHeaderSchema = t.Object({
  authorization: t.Optional(t.String()),
})
