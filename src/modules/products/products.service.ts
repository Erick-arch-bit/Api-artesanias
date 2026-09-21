import { productsRepository } from './products.repository'
import { categoriesRepository } from '../categories/categories.repository'
import { AppError } from '../../shared/errors/app-error'
import type {
  CreateProductInput,
  ProductFilters,
  UpdateProductInput,
} from './products.types'
import { getPagination, paginated } from '../../shared/http/pagination'

export const productsService = {
  list: async (filters: ProductFilters = {}) => {
    const { page, limit, ...productFilters } = filters
    const currentPagination = getPagination({ page, limit })
    const result = filters.categoryId || filters.search?.trim()
      ? await productsRepository.findActiveByFilters(productFilters, currentPagination)
      : await productsRepository.findActive(currentPagination)
    return paginated(result.items, currentPagination.page, currentPagination.limit, result.total)
  },

  getById: async (id: string) => {
    const product = await productsRepository.findById(id)
    if (!product) {
      throw AppError.notFound('Producto no encontrado')
    }
    return product
  },

  create: async (data: CreateProductInput, createdBy?: string) => {
    const normalizedName = data.name.trim()
    if (!normalizedName) {
      throw AppError.validation('El nombre del producto es obligatorio')
    }

    const category = await categoriesRepository.findById(data.categoryId)
    if (!category) {
      throw AppError.invalidReference('La categoría especificada no existe')
    }
    if (!category.active) {
      throw AppError.invalidReference(
        'No se puede crear un producto con una categoría inactiva',
      )
    }

    if (data.salePrice < 0 || data.costPrice < 0) {
      throw AppError.validation('Los precios no pueden ser negativos')
    }

    if (data.stockQuantity < 0 || data.minimumStock < 0) {
      throw AppError.validation(
        'Las cantidades de stock no pueden ser negativas',
      )
    }

    if (!Number.isInteger(data.stockQuantity) || !Number.isInteger(data.minimumStock)) {
      throw AppError.validation(
        'Las cantidades de stock deben ser números enteros',
      )
    }

    return productsRepository.createWithInitialStock({
      product: {
        name: normalizedName,
        categoryId: data.categoryId,
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        costPriceCents: Math.round(data.costPrice * 100),
        salePriceCents: Math.round(data.salePrice * 100),
        dozenPriceCents: data.dozenPrice === undefined ? null : Math.round(data.dozenPrice * 100),
        minimumStock: data.minimumStock,
      },
      stockQuantity: data.stockQuantity,
      createdBy,
    })
  },

  update: async (id: string, data: UpdateProductInput) => {
    const existing = await productsRepository.findById(id)
    if (!existing) {
      throw AppError.notFound('Producto no encontrado')
    }

    const normalizedName = data.name.trim()
    if (!normalizedName) {
      throw AppError.validation('El nombre del producto es obligatorio')
    }

    const category = await categoriesRepository.findById(data.categoryId)
    if (!category) {
      throw AppError.invalidReference('La categoría especificada no existe')
    }
    if (!category.active) {
      throw AppError.invalidReference(
        'No se puede asignar un producto a una categoría inactiva',
      )
    }

    if (data.salePrice < 0 || data.costPrice < 0) {
      throw AppError.validation('Los precios no pueden ser negativos')
    }

    if (data.minimumStock < 0) {
      throw AppError.validation(
        'Las cantidades de stock no pueden ser negativas',
      )
    }

    if (!Number.isInteger(data.minimumStock)) {
      throw AppError.validation(
        'Las cantidades de stock deben ser números enteros',
      )
    }

    return productsRepository.update(id, {
      name: normalizedName,
      categoryId: data.categoryId,
      description: data.description?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      costPriceCents: Math.round(data.costPrice * 100),
      salePriceCents: Math.round(data.salePrice * 100),
      dozenPriceCents: data.dozenPrice === undefined ? null : Math.round(data.dozenPrice * 100),
      minimumStock: data.minimumStock,
    })
  },

  setActive: async (id: string, active: boolean) => {
    const existing = await productsRepository.findById(id)
    if (!existing) {
      throw AppError.notFound('Producto no encontrado')
    }

    return productsRepository.update(id, { active })
  },

  remove: async (id: string, confirm: boolean) => {
    if (!confirm) {
      throw AppError.confirmationRequired(
        'Debes confirmar la eliminación usando confirm=true',
      )
    }

    const existing = await productsRepository.findById(id)
    if (!existing) {
      throw AppError.notFound('Producto no encontrado')
    }

    if (!existing.active) {
      return existing
    }

    return productsRepository.update(id, { active: false })
  },
}
