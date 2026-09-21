import { AppError } from '../../shared/errors/app-error'
import { customersRepository } from './customers.repository'

export const customersService = {
  list: async () => customersRepository.findAll(),

  getById: async (id: string) => {
    const customer = await customersRepository.findById(id)
    if (!customer) {
      throw AppError.notFound('Cliente no encontrado.')
    }
    return customer
  },

  create: async (payload: {
    name: string
    phone?: string | null
    neighborhood?: string | null
    frequentDeliveryPoint?: string | null
    notes?: string | null
  }) => {
    const name = payload.name?.trim()
    if (!name) {
      throw AppError.validation('El nombre del cliente es obligatorio.')
    }

    const phone = payload.phone?.trim() || null
    if (!phone) {
      throw AppError.validation('El teléfono del cliente es obligatorio.')
    }

    return customersRepository.create({
      name,
      phone,
      neighborhood: payload.neighborhood?.trim() || null,
      frequentDeliveryPoint: payload.frequentDeliveryPoint?.trim() || null,
      notes: payload.notes?.trim() || null,
      active: true,
    })
  },

  update: async (
    id: string,
    payload: {
      name?: string
      phone?: string | null
      neighborhood?: string | null
      frequentDeliveryPoint?: string | null
      notes?: string | null
      active?: boolean
    },
  ) => {
    const existing = await customersRepository.findById(id)
    if (!existing) {
      throw AppError.notFound('Cliente no encontrado.')
    }

    const nextData: Partial<typeof existing> = {}
    if (payload.name !== undefined) {
      const value = payload.name.trim()
      if (!value) throw AppError.validation('El nombre del cliente es obligatorio.')
      nextData.name = value
    }
    if (payload.phone !== undefined) {
      const value = payload.phone?.trim() || null
      if (!value) throw AppError.validation('El teléfono del cliente es obligatorio.')
      nextData.phone = value
    }
    if (payload.neighborhood !== undefined) nextData.neighborhood = payload.neighborhood?.trim() || null
    if (payload.frequentDeliveryPoint !== undefined) {
      nextData.frequentDeliveryPoint = payload.frequentDeliveryPoint?.trim() || null
    }
    if (payload.notes !== undefined) nextData.notes = payload.notes?.trim() || null
    if (payload.active !== undefined) nextData.active = payload.active

    const updated = await customersRepository.update(id, nextData)
    if (!updated) throw AppError.notFound('Cliente no encontrado.')
    return updated
  },

  remove: async (id: string) => {
    const existing = await customersRepository.findById(id)
    if (!existing) {
      throw AppError.notFound('Cliente no encontrado.')
    }

    return customersRepository.update(id, { active: false })
  },
}
