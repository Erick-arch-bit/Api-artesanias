import { AppError } from '../../shared/errors/app-error'
import { usersRepository } from './users.repository'

export const usersService = {
  list: async () => {
    const rows = await usersRepository.findAll()
    return rows.map(({ passwordHash, ...user }) => user)
  },

  getById: async (id: string) => {
    const user = await usersRepository.findById(id)
    if (!user) {
      throw AppError.notFound('Usuario no encontrado.')
    }

    const { passwordHash: _passwordHash, ...safeUser } = user
    return safeUser
  },

  create: async (payload: { name: string; email: string; password: string; role?: string }) => {
    const name = payload.name.trim()
    const email = payload.email.trim().toLowerCase()

    if (!name) throw AppError.validation('El nombre es obligatorio.')
    if (!email || !email.includes('@')) throw AppError.validation('El correo electrónico no es válido.')
    if (!payload.password || payload.password.length < 8) throw AppError.validation('La contraseña debe tener al menos 8 caracteres.')

    const exists = await usersRepository.findByEmail(email)
    if (exists) throw AppError.duplicate('Ya existe un usuario con ese correo electrónico.')

    const passwordHash = await Bun.password.hash(payload.password)
    const created = await usersRepository.create({
      name,
      email,
      passwordHash,
      role: payload.role ?? 'seller',
      active: true,
    })

    if (!created) throw AppError.internal('No se pudo crear el usuario.')

    const { passwordHash: _passwordHash, ...safeUser } = created
    return safeUser
  },

  update: async (id: string, payload: { name?: string; email?: string; role?: string; active?: boolean }) => {
    const existing = await usersRepository.findById(id)
    if (!existing) throw AppError.notFound('Usuario no encontrado.')

    const name = payload.name?.trim()
    const email = payload.email?.trim().toLowerCase()

    if (name !== undefined && !name) throw AppError.validation('El nombre no puede quedar vacío.')
    if (email !== undefined && (!email || !email.includes('@'))) throw AppError.validation('El correo electrónico no es válido.')

    const nextData: Partial<typeof existing> = {}
    if (name !== undefined) nextData.name = name
    if (email !== undefined) nextData.email = email
    if (payload.role !== undefined) nextData.role = payload.role
    if (payload.active !== undefined) nextData.active = payload.active

    const updated = await usersRepository.update(id, nextData)
    if (!updated) throw AppError.notFound('Usuario no encontrado.')

    const { passwordHash: _passwordHash, ...safeUser } = updated
    return safeUser
  },

  setStatus: async (id: string, active: boolean) => {
    const existing = await usersRepository.findById(id)
    if (!existing) throw AppError.notFound('Usuario no encontrado.')

    const updated = await usersRepository.update(id, { active })
    const { passwordHash: _passwordHash, ...safeUser } = updated!
    return safeUser
  },
}
