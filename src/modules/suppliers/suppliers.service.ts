import { AppError } from '../../shared/errors/app-error'
import { suppliersRepository } from './suppliers.repository'

export const suppliersService = {
  list: async () => suppliersRepository.findAll(),

  getById: async (id: string) => {
    const supplier = await suppliersRepository.findById(id)
    if (!supplier) {
      throw AppError.notFound('Proveedor no encontrado.')
    }
    return supplier
  },

  create: async (payload: { name: string; city: string; phone?: string | null; notes?: string | null }) => {
    const name = payload.name.trim()
    const city = payload.city.trim()

    if (!name) throw AppError.validation('El nombre del proveedor es obligatorio.')
    if (!city) throw AppError.validation('La ciudad del proveedor es obligatoria.')

    return suppliersRepository.create({
      name,
      city,
      phone: payload.phone?.trim() || null,
      notes: payload.notes?.trim() || null,
      active: true,
    })
  },

  update: async (id: string, payload: { name?: string; city?: string; phone?: string | null; notes?: string | null; active?: boolean }) => {
    const existing = await suppliersRepository.findById(id)
    if (!existing) {
      throw AppError.notFound('Proveedor no encontrado.')
    }

    const nextData: Partial<typeof existing> = {}
    if (payload.name !== undefined) {
      const value = payload.name.trim()
      if (!value) throw AppError.validation('El nombre del proveedor es obligatorio.')
      nextData.name = value
    }
    if (payload.city !== undefined) {
      const value = payload.city.trim()
      if (!value) throw AppError.validation('La ciudad del proveedor es obligatoria.')
      nextData.city = value
    }
    if (payload.phone !== undefined) nextData.phone = payload.phone?.trim() || null
    if (payload.notes !== undefined) nextData.notes = payload.notes?.trim() || null
    if (payload.active !== undefined) nextData.active = payload.active

    const updated = await suppliersRepository.update(id, nextData)
    if (!updated) throw AppError.notFound('Proveedor no encontrado.')
    return updated
  },

  remove: async (id: string) => {
    const existing = await suppliersRepository.findById(id)
    if (!existing) {
      throw AppError.notFound('Proveedor no encontrado.')
    }

    return suppliersRepository.update(id, { active: false })
  },
}
