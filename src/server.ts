import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
  .use(cors())
  .get('/health', () => ({
    success: true,
    data: {
      status: 'ok',
      service: 'api-artesanias',
    },
    error: null,
  }))
  .listen(3000)

console.log(
  `API de Artesanías ejecutándose en http://${app.server?.hostname}:${app.server?.port}`,
 )
