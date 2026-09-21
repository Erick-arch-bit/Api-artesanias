import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { authService } from './auth.service'
import { loginSchema, registerSchema } from './auth.schemas'
import { AppError } from '../../shared/errors/app-error'
import { successResponse } from '../../shared/http/responses'
import { env } from '../../config/env'
import { authRateLimiter, enforceRateLimit } from '../../shared/middleware/rate-limit'
import { usersRepository } from '../users/users.repository'

const authRoutes = new Elysia({ prefix: '/api/v1/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: env.JWT_SECRET,
      exp: env.JWT_EXPIRES_IN,
    }),
  )
  .post(
    '/register',
    async ({ body, headers, jwt, set, request }) => {
      enforceRateLimit(request, authRateLimiter)
      if (!env.AUTH_REGISTRATION_ENABLED || headers['x-bootstrap-token'] !== env.AUTH_BOOTSTRAP_TOKEN) {
        throw AppError.notFound('La ruta de registro no está disponible.')
      }
      const user = await authService.register(body)
      const token = await jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion,
      })

      set.status = 201
      return successResponse({
        token,
        user,
      })
    },
    { body: registerSchema },
  )
  .post(
    '/login',
    async ({ body, jwt, set, request }) => {
      enforceRateLimit(request, authRateLimiter)
      const user = await authService.login(body)
      const token = await jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion,
      })

      set.status = 200
      return successResponse({
        token,
        user,
      })
    },
    { body: loginSchema },
  )
  .get('/me', async ({ headers, jwt }) => {
    const authorization = headers.authorization ?? ''
    const token = authorization.replace(/^Bearer\s+/i, '')

    if (!token) {
      throw AppError.unauthorized('Se requiere un token de autenticación.')
    }

    const payload = await jwt.verify(token)
    if (!payload || !payload.sub) {
      throw AppError.unauthorized('Token inválido o expirado.')
    }

    const user = await authService.me(String(payload.sub), Number(payload.tokenVersion))
    return successResponse({ user })
  })
  .post('/logout', async ({ headers, jwt }) => {
    const authorization = headers.authorization ?? ''
    const token = authorization.replace(/^Bearer\s+/i, '')
    if (!token) throw AppError.unauthorized('Se requiere un token de autenticación.')
    const payload = await jwt.verify(token)
    if (typeof payload !== 'object' || !payload || !payload.sub) throw AppError.unauthorized('Token inválido o expirado.')
    const user = await usersRepository.findById(String(payload.sub))
    if (!user || !user.active || user.tokenVersion !== Number(payload.tokenVersion)) {
      throw AppError.unauthorized('Token inválido o revocado.')
    }
    await usersRepository.incrementTokenVersion(user.id)
    return successResponse({ loggedOut: true })
  })

export { authRoutes }
