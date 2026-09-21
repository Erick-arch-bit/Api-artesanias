import { Elysia } from 'elysia'
import { authMiddleware, requireRole } from '../../shared/middleware/auth'
import { usersService } from './users.service'
import { createUserSchema, setUserStatusSchema, updateUserSchema, userParamsSchema } from './users.schemas'
import { successResponse } from '../../shared/http/responses'

export const usersRoutes = new Elysia({ prefix: '/api/v1/users' })
  .use(authMiddleware)
  .get('/', async ({ user }) => {
    requireRole('admin')({ user })
    return successResponse(await usersService.list())
  })
  .get('/:id', async ({ params, user }) => {
    requireRole('admin')({ user })
    return successResponse(await usersService.getById(params.id))
  }, { params: userParamsSchema })
  .post('/', async ({ body, user }) => {
    requireRole('admin')({ user })
    const data = await usersService.create(body)
    return successResponse(data)
  }, { body: createUserSchema })
  .patch('/:id', async ({ params, body, user }) => {
    requireRole('admin')({ user })
    return successResponse(await usersService.update(params.id, body))
  }, { params: userParamsSchema, body: updateUserSchema })
  .patch('/:id/status', async ({ params, body, user }) => {
    requireRole('admin')({ user })
    return successResponse(await usersService.setStatus(params.id, body.active))
  }, { params: userParamsSchema, body: setUserStatusSchema })
