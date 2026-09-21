import { t } from 'elysia'

export const paginationQuerySchema = t.Object({
  page: t.Optional(t.Integer({ minimum: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
})

export interface PaginationInput {
  page?: number
  limit?: number
}

export interface PaginationResult<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

export function getPagination(input: PaginationInput = {}) {
  const page = input.page ?? 1
  const limit = input.limit ?? 20
  return { page, limit, offset: (page - 1) * limit }
}

export function paginated<T>(items: T[], page: number, limit: number, total: number): PaginationResult<T> {
  return { items, pagination: { page, limit, total } }
}