import { Elysia } from 'elysia'
import { authMiddleware, requireRole } from '../../shared/middleware/auth'
import { successResponse } from '../../shared/http/responses'
import { inventoryRepository } from '../inventory/inventory.repository'
import { ordersRepository } from '../orders/orders.repository'
import { salesRepository } from '../sales/sales.repository'

export const dashboardRoutes = new Elysia({ prefix: '/api/v1/dashboard' })
  .use(authMiddleware)
  .get('/', async ({ user }) => {
    requireRole(['admin', 'seller'])({ user })
    const [salesResult, ordersResult, inventory] = await Promise.all([
      salesRepository.findAll({ page: 1, limit: 100 }),
      ordersRepository.findAll({ page: 1, limit: 100 }),
      inventoryRepository.findAll(),
    ])
    const sales = salesResult.items
    const orders = ordersResult.items
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const salesToday = sales.filter((sale) => sale.soldAt >= startOfDay)
    const pendingOrders = orders.filter((order) => !['delivered', 'cancelled'].includes(order.orderStatus))

    return successResponse({
      salesTodayCents: salesToday.reduce((sum, sale) => sum + sale.totalCents, 0),
      estimatedProfitTodayCents: salesToday.reduce((sum, sale) => sum + sale.grossProfitCents, 0),
      ordersPendingDelivery: pendingOrders.length,
      pendingPaymentsCents: orders.reduce((sum, order) => sum + order.pendingBalanceCents, 0),
      lowStockProducts: inventory.filter((item) => item.currentStock <= item.minimumStock),
      upcomingDeliveries: pendingOrders.filter((order) => order.deliveryDate),
    })
  })
