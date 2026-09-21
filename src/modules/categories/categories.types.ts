import type { categories } from '../../database/schema'

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type UpdateCategoryData = Pick<NewCategory, 'name'>
