import { t } from 'elysia'

export const createCategorySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
})

export const updateCategorySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
})

export const setActiveCategorySchema = t.Object({
  active: t.Boolean(),
})

export const categoryParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
})

export const categoryQuerySchema = t.Object({
  includeInactive: t.Optional(t.BooleanString()),
})

export const deleteCategoryQuerySchema = t.Object({
  confirm: t.Optional(t.String()),
})

export type CreateCategoryInput = { name: string }
export type UpdateCategoryInput = { name: string }
export type SetActiveInput = { active: boolean }
