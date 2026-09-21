import { categoriesRepository } from './categories.repository'
import { AppError } from '../../shared/errors/app-error'

export const categoriesService = {
  list: (includeInactive: boolean) =>
    includeInactive ? categoriesRepository.findAll() : categoriesRepository.findActive(),

  getById: async (id: string) => {
    const category = await categoriesRepository.findById(id)
    if (!category) {
      throw AppError.notFound('Categoría no encontrada')
    }
    return category
  },

  create: async (name: string) => {
    const normalizedName = name.trim()

    if (!normalizedName) {
      throw AppError.validation('El nombre de la categoría es obligatorio')
    }

    const existing = await categoriesRepository.findByName(normalizedName)
    if (existing) {
      throw AppError.duplicate('Ya existe una categoría con ese nombre')
    }

    return categoriesRepository.create(normalizedName)
  },

  update: async (id: string, name: string) => {
    const normalizedName = name.trim()

    if (!normalizedName) {
      throw AppError.validation('El nombre de la categoría es obligatorio')
    }

    const existing = await categoriesRepository.findById(id)
    if (!existing) {
      throw AppError.notFound('Categoría no encontrada')
    }

    const duplicate = await categoriesRepository.findByNameExcludingId(
      normalizedName,
      id,
    )
    if (duplicate) {
      throw AppError.duplicate('Ya existe otra categoría con ese nombre')
    }

    return categoriesRepository.update(id, { name: normalizedName })
  },

  setActive: async (id: string, active: boolean) => {
    const existing = await categoriesRepository.findById(id)
    if (!existing) {
      throw AppError.notFound('Categoría no encontrada')
    }

    return categoriesRepository.setActive(id, active)
  },

  remove: async (id: string, confirm: boolean) => {
    if (!confirm) {
      throw AppError.confirmationRequired(
        'Debes confirmar la eliminación usando confirm=true',
      )
    }

    const existing = await categoriesRepository.findById(id)
    if (!existing) {
      throw AppError.notFound('Categoría no encontrada')
    }

    if (!existing.active) {
      return existing
    }

    return categoriesRepository.setActive(id, false)
  },
}
