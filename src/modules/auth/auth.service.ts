import { AppError } from '../../shared/errors/app-error'
import { authRepository } from './auth.repository'
import type { AuthUser, LoginInput, RegisterInput } from './auth.types'

function sanitizeUser(user: {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  tokenVersion: number
  createdAt: Date | null
  updatedAt: Date | null
  passwordHash?: string
}): AuthUser {
  const { passwordHash: _passwordHash, ...safeUser } = user
  return safeUser
}

export const authService = {
  register: async ({ name, email, password }: RegisterInput) => {
    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedName) {
      throw AppError.validation('El nombre es obligatorio.')
    }

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw AppError.validation('El correo electrónico no es válido.')
    }

    if (password.length < 8) {
      throw AppError.validation('La contraseña debe tener al menos 8 caracteres.')
    }

    const existing = await authRepository.findByEmail(normalizedEmail)
    if (existing) {
      throw AppError.duplicate('Ya existe un usuario con ese correo electrónico.')
    }

    const passwordHash = await Bun.password.hash(password)
    const created = await authRepository.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role: 'admin',
    })

    if (!created) throw AppError.internal('No se pudo crear el usuario.')

    return sanitizeUser(created)
  },

  login: async ({ email, password }: LoginInput) => {
    const normalizedEmail = email.trim().toLowerCase()
    const user = await authRepository.findByEmail(normalizedEmail)

    if (!user || !user.active) {
      throw AppError.unauthorized('Credenciales inválidas.')
    }

    const isValid = await Bun.password.verify(password, user.passwordHash)
    if (!isValid) {
      throw AppError.unauthorized('Credenciales inválidas.')
    }

    return sanitizeUser(user)
  },

  me: async (userId: string, expectedTokenVersion?: number) => {
    const user = await authRepository.findById(userId)
    if (!user || !user.active) {
      throw AppError.notFound('Usuario no encontrado.')
    }
    if (expectedTokenVersion !== undefined && user.tokenVersion !== expectedTokenVersion) {
      throw AppError.unauthorized('El token fue revocado.')
    }

    return sanitizeUser(user)
  },
}
