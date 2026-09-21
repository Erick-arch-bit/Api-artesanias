import { Elysia } from 'elysia'
import { authMiddleware, requireRole } from '../../shared/middleware/auth'
import { successResponse } from '../../shared/http/responses'
import { inventoryRepository } from './inventory.repository'
import { inventoryMovementsQuerySchema, inventoryQuerySchema } from './inventory.schemas'
import { getPagination, paginated } from '../../shared/http/pagination'

export const inventoryRoutes = new Elysia({ prefix: '/api/v1/inventory' })
  .use(authMiddleware)
  .get('/', async ({ query, user }) => {
    requireRole(['admin', 'seller'])({ user })
    const inventory = await inventoryRepository.findAll()
    return successResponse(query.lowStock ? inventory.filter((item) => item.currentStock <= item.minimumStock) : inventory)
  }, { query: inventoryQuerySchema })
  .get('/low-stock', async ({ user }) => {
    requireRole(['admin', 'seller'])({ user })
    const inventory = await inventoryRepository.findAll()
    return successResponse(inventory.filter((item) => item.currentStock <= item.minimumStock))
  })
  .get('/movements', async ({ query, user }) => {
    requireRole(['admin', 'seller'])({ user })
    const pagination = getPagination(query)
    const result = await inventoryRepository.findMovements(query, pagination)
    return successResponse(paginated(result.items, pagination.page, pagination.limit, result.total))
  }, { query: inventoryMovementsQuerySchema })
