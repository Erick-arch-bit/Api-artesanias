import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { AppError } from '../errors/app-error'
import { env } from '../../config/env'
import { usersRepository } from '../../modules/users/users.repository'

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .use(
    jwt({
      name: 'jwt',
      secret: env.JWT_SECRET,
      exp: env.JWT_EXPIRES_IN,
    }),
  )
  .derive(async ({ headers, jwt }) => {
    const header = headers.authorization ?? ''
    const token = header.replace(/^Bearer\s+/i, '')

    if (!token) {
      return { user: null }
    }

    const payload = await jwt.verify(token)
    if (!payload || !payload.sub) {
      return { user: null }
    }

    const currentUser = await usersRepository.findById(String(payload.sub))
    if (!currentUser || !currentUser.active) {
      return { user: null }
    }
    if (Number(payload.tokenVersion) !== currentUser.tokenVersion) {
      return { user: null }
    }

    return {
      user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        tokenVersion: currentUser.tokenVersion,
      },
    }
  })
  .as('global')
  .onBeforeHandle(({ user }) => {
    if (!user) {
      throw AppError.unauthorized('Se requiere un token de autenticación.')
    }
  })

export function requireRole(role: string | string[]) {
  const allowed = Array.isArray(role) ? role : [role]

  return ({ user }: { user?: { id?: string; role: string } | null }) => {
    if (!user) {
      throw AppError.unauthorized('Se requiere un token de autenticación.')
    }

    if (!allowed.includes(user.role)) {
      throw AppError.forbidden('No tienes permisos para realizar esta acción.')
    }
    return user
  }
}
