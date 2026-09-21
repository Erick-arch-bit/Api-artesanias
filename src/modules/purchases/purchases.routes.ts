import { Elysia } from 'elysia'
import { authMiddleware, requireRole } from '../../shared/middleware/auth'
import { purchasesRepository } from './purchases.repository'
import { purchasesService } from './purchases.service'
import { createPurchaseSchema, purchaseParamsSchema, purchasesQuerySchema } from './purchases.schemas'
import { successResponse } from '../../shared/http/responses'
import { AppError } from '../../shared/errors/app-error'
import { getPagination, paginated } from '../../shared/http/pagination'

export const purchasesRoutes = new Elysia({ prefix: '/api/v1/purchases' })
  .use(authMiddleware)
  .get('/', async ({ user, query }) => {
    requireRole(['admin', 'seller'])({ user })
    const pagination = getPagination(query)
    const result = await purchasesRepository.findAll(pagination)
    return successResponse(paginated(result.items, pagination.page, pagination.limit, result.total))
  }, { query: purchasesQuerySchema })
  .get('/:id', async ({ params, user }) => {
    requireRole(['admin', 'seller'])({ user })
    const purchase = await purchasesRepository.findById(params.id)
    if (!purchase) throw AppError.notFound('Surtido no encontrado.')
    return successResponse({ purchase, details: await purchasesRepository.findDetailsByPurchaseId(params.id) })
  }, { params: purchaseParamsSchema })
  .post('/', async ({ body, user }) => {
    const currentUser = requireRole(['admin', 'seller'])({ user })
    const data = await purchasesService.createPurchase({
      ...body,
      createdBy: currentUser.id!,
      purchaseDate: body.purchaseDate,
    })
    return successResponse(data)
  }, { body: createPurchaseSchema })
