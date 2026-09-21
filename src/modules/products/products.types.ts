import type { products } from '../../database/schema'
import type { PaginationInput } from '../../shared/http/pagination'

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type UpdateProductData = Pick<
  NewProduct,
  | 'name'
  | 'categoryId'
  | 'description'
  | 'imageUrl'
  | 'costPriceCents'
  | 'salePriceCents'
  | 'dozenPriceCents'
  | 'minimumStock'
>

export interface CreateProductInput {
  name: string
  categoryId: string
  description?: string
  imageUrl?: string
  salePrice: number
  dozenPrice?: number
  costPrice: number
  stockQuantity: number
  minimumStock: number
}

export type UpdateProductInput = Omit<CreateProductInput, 'stockQuantity'>

export interface ProductFilters {
  categoryId?: string
  search?: string
  page?: PaginationInput['page']
  limit?: PaginationInput['limit']
}
