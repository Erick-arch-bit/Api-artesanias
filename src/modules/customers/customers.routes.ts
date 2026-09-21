import { Elysia } from 'elysia'
import { authMiddleware, requireRole } from '../../shared/middleware/auth'
import { successResponse } from '../../shared/http/responses'
import { customersService } from './customers.service'
import { createCustomerSchema, customerParamsSchema, updateCustomerSchema } from './customers.schemas'

export const customersRoutes = new Elysia({ prefix: '/api/v1/customers' })
  .use(authMiddleware)
  .get('/', async ({ user }) => {
    requireRole(['admin', 'seller'])({ user })
    return successResponse(await customersService.list())
  })
  .get('/:id', async ({ params, user }) => {
    requireRole(['admin', 'seller'])({ user })
    return successResponse(await customersService.getById(params.id))
  }, { params: customerParamsSchema })
  .post('/', async ({ body, user }) => {
    requireRole(['admin', 'seller'])({ user })
    return successResponse(await customersService.create(body))
  }, { body: createCustomerSchema })
  .patch('/:id', async ({ params, body, user }) => {
    requireRole(['admin', 'seller'])({ user })
    return successResponse(await customersService.update(params.id, body))
  }, { params: customerParamsSchema, body: updateCustomerSchema })
  .delete('/:id', async ({ params, user }) => {
    requireRole('admin')({ user })
    return successResponse(await customersService.remove(params.id))
  }, { params: customerParamsSchema })
