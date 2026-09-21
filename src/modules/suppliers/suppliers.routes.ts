import { Elysia } from 'elysia'
import { authMiddleware, requireRole } from '../../shared/middleware/auth'
import { suppliersService } from './suppliers.service'
import { createSupplierSchema, supplierParamsSchema, updateSupplierSchema } from './suppliers.schemas'
import { successResponse } from '../../shared/http/responses'

export const suppliersRoutes = new Elysia({ prefix: '/api/v1/suppliers' })
  .use(authMiddleware)
  .get('/', async ({ user }) => {
    requireRole(['admin', 'seller'])({ user })
    return successResponse(await suppliersService.list())
  })
  .get('/:id', async ({ params, user }) => {
    requireRole(['admin', 'seller'])({ user })
    return successResponse(await suppliersService.getById(params.id))
  }, { params: supplierParamsSchema })
  .post('/', async ({ body, user }) => {
    requireRole(['admin', 'seller'])({ user })
    const data = await suppliersService.create(body)
    return successResponse(data)
  }, { body: createSupplierSchema })
  .patch('/:id', async ({ params, body, user }) => {
    requireRole(['admin', 'seller'])({ user })
    return successResponse(await suppliersService.update(params.id, body))
  }, { params: supplierParamsSchema, body: updateSupplierSchema })
  .delete('/:id', async ({ params, user }) => {
    requireRole('admin')({ user })
    return successResponse(await suppliersService.remove(params.id))
  }, { params: supplierParamsSchema })
