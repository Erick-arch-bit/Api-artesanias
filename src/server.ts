import { app } from './app'
import { env } from './config/env'

app.listen({ port: env.PORT, hostname: env.HOST })

console.log(
  `API de Artesanías ejecutándose en http://${app.server?.hostname}:${app.server?.port}`,
 )
