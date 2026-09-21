import { Elysia } from 'elysia'
import {
  createCategorySchema,
  updateCategorySchema,
  setActiveCategorySchema,
  categoryParamsSchema,
  categoryQuerySchema,
  deleteCategoryQuerySchema,
} from './categories.schemas'
import { categoriesService } from './categories.service'
import { successResponse } from '../../shared/http/responses'
import { authMiddleware, requireRole } from '../../shared/middleware/auth'

export const categoriesRoutes = new Elysia({ prefix: '/api/categories' })
  .use(authMiddleware)
  .get(
    '/',
    async ({ query }) => {
      const includeInactive = query.includeInactive === true
      const data = await categoriesService.list(includeInactive)
      return successResponse(data)
    },
    { query: categoryQuerySchema },
  )
  .get(
    '/:id',
    async ({ params }) => {
      const data = await categoriesService.getById(params.id)
      return successResponse(data)
    },
    { params: categoryParamsSchema },
  )
  .post(
    '/',
    async ({ body, set, user }) => {
      requireRole(['admin', 'seller'])({ user })
      const data = await categoriesService.create(body.name)
      set.status = 201
      return successResponse(data)
    },
    { body: createCategorySchema },
  )
  .put(
    '/:id',
    async ({ params, body, user }) => {
      requireRole(['admin', 'seller'])({ user })
      const data = await categoriesService.update(params.id, body.name)
      return successResponse(data)
    },
    { params: categoryParamsSchema, body: updateCategorySchema },
  )
  .patch(
    '/:id/active',
    async ({ params, body, user }) => {
      requireRole(['admin', 'seller'])({ user })
      const data = await categoriesService.setActive(params.id, body.active)
      return successResponse(data)
    },
    { params: categoryParamsSchema, body: setActiveCategorySchema },
  )
  .delete(
    '/:id',
    async ({ params, query, user }) => {
      requireRole(['admin', 'seller'])({ user })
      const confirm = query.confirm === 'true'
      const data = await categoriesService.remove(params.id, confirm)
      return successResponse(data)
    },
    { params: categoryParamsSchema, query: deleteCategoryQuerySchema },
  )
