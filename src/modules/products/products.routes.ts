import { Elysia } from 'elysia'
import {
  createProductSchema,
  updateProductSchema,
  setActiveProductSchema,
  productParamsSchema,
  productQuerySchema,
  deleteProductQuerySchema,
} from './products.schemas'
import { productsService } from './products.service'
import { successResponse } from '../../shared/http/responses'
import { authMiddleware, requireRole } from '../../shared/middleware/auth'

export const productsRoutes = new Elysia({ prefix: '/api/v1/products' })
  .use(authMiddleware)
  .get(
    '/',
    async ({ query }) => {
      const data = await productsService.list({
        categoryId: query.categoryId,
        search: query.search,
        page: query.page,
        limit: query.limit,
      })
      return successResponse(data)
    },
    { query: productQuerySchema },
  )
  .get(
    '/:id',
    async ({ params }) => {
      const data = await productsService.getById(params.id)
      return successResponse(data)
    },
    { params: productParamsSchema },
  )
  .post(
    '/',
    async ({ body, set, user }) => {
      requireRole(['admin', 'seller'])({ user })
      const data = await productsService.create(body, user!.id)
      set.status = 201
      return successResponse(data)
    },
    { body: createProductSchema },
  )
  .put(
    '/:id',
    async ({ params, body, user }) => {
      requireRole(['admin', 'seller'])({ user })
      const data = await productsService.update(params.id, body)
      return successResponse(data)
    },
    { params: productParamsSchema, body: updateProductSchema },
  )
  .patch(
    '/:id/active',
    async ({ params, body, user }) => {
      requireRole(['admin', 'seller'])({ user })
      const data = await productsService.setActive(params.id, body.active)
      return successResponse(data)
    },
    { params: productParamsSchema, body: setActiveProductSchema },
  )
  .delete(
    '/:id',
    async ({ params, query, user }) => {
      requireRole(['admin', 'seller'])({ user })
      const confirm = query.confirm === 'true'
      const data = await productsService.remove(params.id, confirm)
      return successResponse(data)
    },
    { params: productParamsSchema, query: deleteProductQuerySchema },
  )
