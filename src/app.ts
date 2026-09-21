import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { categoriesRoutes } from './modules/categories/categories.routes'
import { productsRoutes } from './modules/products/products.routes'
import { authRoutes } from './modules/auth/auth.routes'
import { usersRoutes } from './modules/users/users.routes'
import { suppliersRoutes } from './modules/suppliers/suppliers.routes'
import { purchasesRoutes } from './modules/purchases/purchases.routes'
import { customersRoutes } from './modules/customers/customers.routes'
import { salesRoutes } from './modules/sales/sales.routes'
import { ordersRoutes } from './modules/orders/orders.routes'
import { inventoryRoutes } from './modules/inventory/inventory.routes'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes'
import { toErrorResponse } from './shared/errors/error-handler'
import { successResponse } from './shared/http/responses'
import { env } from './config/env'

const corsOrigin = env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((origin) => origin.trim())

export const app = new Elysia()
  .use(
    cors({
      origin: corsOrigin,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Bootstrap-Token', 'Idempotency-Key'],
    }),
  )
  .use(
    swagger({
      path: '/api/v1/docs',
      documentation: {
        info: {
          title: 'API Artesanías',
          version: '1.0.0',
          description:
            'API de control de inventario, surtidos, ventas, pedidos y reportes del negocio de artesanías de barro.',
        },
      },
    }),
  )
  .onError(({ code, error, set }) => toErrorResponse({ code, error, set }))
  .use(categoriesRoutes)
  .use(productsRoutes)
  .use(authRoutes)
  .use(usersRoutes)
  .use(suppliersRoutes)
  .use(purchasesRoutes)
  .use(customersRoutes)
  .use(salesRoutes)
  .use(ordersRoutes)
  .use(inventoryRoutes)
  .use(dashboardRoutes)
  .get('/health', () =>
    successResponse({
      status: 'ok',
      service: 'api-artesanias',
    }),
  )
  .get('/api/v1/health', () =>
    successResponse({
      status: 'ok',
      service: 'api-artesanias',
    }),
  )
