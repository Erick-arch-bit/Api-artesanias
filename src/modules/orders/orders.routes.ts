import { Elysia, t } from 'elysia'
import { authMiddleware, requireRole } from '../../shared/middleware/auth'
import { ordersRepository } from './orders.repository'
import { ordersService } from './orders.service'
import { createOrderSchema, deliverySchema, orderParamsSchema, orderPaymentSchema, ordersQuerySchema, updateOrderStatusSchema } from './orders.schemas'
import { successResponse } from '../../shared/http/responses'
import { AppError } from '../../shared/errors/app-error'
import { enforceRateLimit, paymentRateLimiter } from '../../shared/middleware/rate-limit'
import { getPagination, paginated } from '../../shared/http/pagination'

export const ordersRoutes = new Elysia({ prefix: '/api/v1/orders' })
  .use(authMiddleware)
  .get('/', async ({ user, query }) => {
    requireRole(['admin', 'seller'])({ user })
    const pagination = getPagination(query)
    const result = await ordersRepository.findAll(pagination)
    return successResponse(paginated(result.items, pagination.page, pagination.limit, result.total))
  }, { query: ordersQuerySchema })
  .post('/expire-reservations', async ({ user }) => {
    const currentUser = requireRole('admin')({ user })
    return successResponse(await ordersService.expireReservations(currentUser.id!))
  })
  .get('/:id', async ({ params, user }) => {
    requireRole(['admin', 'seller'])({ user })
    const order = await ordersRepository.findById(params.id)
    if (!order) throw AppError.notFound('Pedido no encontrado.')
    return successResponse({ order, details: await ordersRepository.findDetailsByOrderId(params.id), payments: await ordersRepository.findPaymentsByOrderId(params.id) })
  }, { params: orderParamsSchema })
  .post('/', async ({ body, user }) => {
    const currentUser = requireRole(['admin', 'seller'])({ user })
    return successResponse(await ordersService.createOrder(body, currentUser.id!))
  }, { body: createOrderSchema })
  .patch('/:id/status', async ({ params, body, user }) => {
    requireRole(['admin', 'seller'])({ user })
    return successResponse(await ordersService.updateStatus(params.id, body.status))
  }, { params: orderParamsSchema, body: updateOrderStatusSchema })
  .post('/:id/payments', async ({ params, body, headers, user, request }) => {
    enforceRateLimit(request, paymentRateLimiter)
    const currentUser = requireRole(['admin', 'seller'])({ user })
    return successResponse(await ordersService.recordPayment(params.id, body.amountCents, body.paymentMethod, currentUser.id!, body.idempotencyKey ?? headers['idempotency-key']))
  }, { params: orderParamsSchema, body: orderPaymentSchema })
  .post('/:id/payments/:paymentId/correct', async ({ params, body, user }) => {
    const currentUser = requireRole('admin')({ user })
    return successResponse(await ordersService.correctPayment(params.id, params.paymentId, body.correctionNote, currentUser.id!))
  }, { params: t.Object({ id: t.String({ format: 'uuid' }), paymentId: t.String({ format: 'uuid' }) }), body: t.Object({ correctionNote: t.Optional(t.String({ maxLength: 1000 })) }) })
  .post('/:id/cancel', async ({ params, user }) => {
    const currentUser = requireRole('admin')({ user })
    return successResponse(await ordersService.cancel(params.id, currentUser.id!))
  }, { params: orderParamsSchema })
  .post('/:id/delivery', async ({ params, body, user }) => {
    requireRole(['admin', 'seller'])({ user })
    return successResponse(await ordersService.registerDelivery(params.id, body))
  }, { params: orderParamsSchema, body: deliverySchema })
