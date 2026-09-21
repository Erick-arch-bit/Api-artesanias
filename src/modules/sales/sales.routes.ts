import { Elysia, t } from 'elysia'
import { authMiddleware, requireRole } from '../../shared/middleware/auth'
import { salesRepository } from './sales.repository'
import { salesService } from './sales.service'
import { createPaymentSchema, createSaleSchema, saleParamsSchema, salesQuerySchema } from './sales.schemas'
import { successResponse } from '../../shared/http/responses'
import { AppError } from '../../shared/errors/app-error'
import { enforceRateLimit, paymentRateLimiter } from '../../shared/middleware/rate-limit'
import { getPagination, paginated } from '../../shared/http/pagination'

export const salesRoutes = new Elysia({ prefix: '/api/v1/sales' })
  .use(authMiddleware)
  .get('/', async ({ user, query }) => {
    const currentUser = requireRole(['admin', 'seller'])({ user })
    const pagination = getPagination(query)
    const result = await salesRepository.findAll(pagination)
    return successResponse(paginated(result.items, pagination.page, pagination.limit, result.total))
  }, { query: salesQuerySchema })
  .get('/:id', async ({ params, user }) => {
    requireRole(['admin', 'seller'])({ user })
    const sale = await salesRepository.findById(params.id)
    if (!sale) throw AppError.notFound('Venta no encontrada.')
    return successResponse({ sale, details: await salesRepository.findDetailsBySaleId(params.id), payments: await salesRepository.findPaymentsBySaleId(params.id) })
  }, { params: saleParamsSchema })
  .post('/', async ({ body, user }) => {
    const currentUser = requireRole(['admin', 'seller'])({ user })
    return successResponse(await salesService.createSale(body, currentUser.id!))
  }, { body: createSaleSchema })
  .post('/:id/payments', async ({ params, body, headers, user, request }) => {
    enforceRateLimit(request, paymentRateLimiter)
    const currentUser = requireRole(['admin', 'seller'])({ user })
    return successResponse(await salesService.recordPayment(params.id, { ...body, idempotencyKey: body.idempotencyKey ?? headers['idempotency-key'] }, currentUser.id!))
  }, { params: saleParamsSchema, body: createPaymentSchema })
  .post('/:id/payments/:paymentId/correct', async ({ params, body, user }) => {
    const currentUser = requireRole('admin')({ user })
    return successResponse(await salesService.correctPayment(params.id, params.paymentId, body.correctionNote, currentUser.id!))
  }, { params: t.Object({ id: t.String({ format: 'uuid' }), paymentId: t.String({ format: 'uuid' }) }), body: t.Object({ correctionNote: t.Optional(t.String({ maxLength: 1000 })) }) })
  .post('/:id/cancel', async ({ params, user }) => {
    const currentUser = requireRole('admin')({ user })
    return successResponse(await salesService.cancel(params.id, currentUser.id!))
  })
