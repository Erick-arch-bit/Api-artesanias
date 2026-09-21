import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { productsService } from './products.service'
import { AppError } from '../../shared/errors/app-error'

type Product = {
  id: string
  name: string
  categoryId: string
  description: string | null
  salePrice: string
  costPrice: string
  stockQuantity: number
  minimumStock: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

type Category = {
  id: string
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const mockProductsRepo = {
  findActive: mock(() => Promise.resolve([] as Product[])),
  findActiveByCategoryId: mock((_categoryId: string) =>
    Promise.resolve([] as Product[]),
  ),
  findActiveByFilters: mock((_filters: unknown) =>
    Promise.resolve([] as Product[]),
  ),
  findById: mock((_id: string) =>
    Promise.resolve(undefined as Product | undefined),
  ),
  create: mock((_data: unknown) =>
    Promise.resolve(undefined as Product | undefined),
  ),
  createWithInitialStock: mock((_data: unknown) =>
    Promise.resolve(undefined as Product | undefined),
  ),
  update: mock((_id: string, _data: unknown) =>
    Promise.resolve(undefined as Product | undefined),
  ),
}

const mockCategoriesRepo = {
  findById: mock((_id: string) =>
    Promise.resolve(undefined as Category | undefined),
  ),
}

mock.module('./products.repository', () => ({
  productsRepository: mockProductsRepo,
}))

mock.module('../categories/categories.repository', () => ({
  categoriesRepository: mockCategoriesRepo,
}))

const product: Product = {
  id: 'prod-1',
  name: 'Vaso artesanal',
  categoryId: 'cat-1',
  description: null,
  salePrice: '120.00',
  costPrice: '60.00',
  stockQuantity: 10,
  minimumStock: 2,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const validInput = {
  name: 'Vaso artesanal',
  categoryId: 'cat-1',
  description: 'Vaso de barro',
  salePrice: 120,
  costPrice: 60,
  stockQuantity: 10,
  minimumStock: 2,
}

const activeCategory: Category = {
  id: 'cat-1',
  name: 'Vasos',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  mockProductsRepo.findActive.mockReset()
  mockProductsRepo.findActiveByCategoryId.mockReset()
  mockProductsRepo.findActiveByFilters.mockReset()
  mockProductsRepo.findById.mockReset()
  mockProductsRepo.create.mockReset()
  mockProductsRepo.createWithInitialStock.mockReset()
  mockProductsRepo.update.mockReset()
  mockCategoriesRepo.findById.mockReset()
})

describe('productsService.list', () => {
  test('lista productos activos', async () => {
    mockProductsRepo.findActive.mockReturnValueOnce(Promise.resolve({ items: [product], total: 1 }))
    const result = await productsService.list()
    expect(result.items).toHaveLength(1)
  })

  test('filtra por categoría cuando se pasa categoryId', async () => {
    mockProductsRepo.findActiveByFilters.mockReturnValueOnce(
      Promise.resolve({ items: [product], total: 1 }),
    )
    const result = await productsService.list({ categoryId: 'cat-1' })
    expect(result.items).toHaveLength(1)
    expect(mockProductsRepo.findActiveByFilters).toHaveBeenCalledWith(
      { categoryId: 'cat-1' },
      { page: 1, limit: 20, offset: 0 },
    )
  })

  test('filtra por búsqueda cuando se pasa search', async () => {
    mockProductsRepo.findActiveByFilters.mockReturnValueOnce(
      Promise.resolve({ items: [product], total: 1 }),
    )
    const result = await productsService.list({ search: 'vaso' })
    expect(result.items).toHaveLength(1)
    expect(mockProductsRepo.findActiveByFilters).toHaveBeenCalledWith(
      { search: 'vaso' },
      { page: 1, limit: 20, offset: 0 },
    )
  })
})

describe('productsService.getById', () => {
  test('devuelve NOT_FOUND si no existe', async () => {
    expect(productsService.getById('nope')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    })
  })

  test('devuelve el producto si existe', async () => {
    mockProductsRepo.findById.mockReturnValueOnce(Promise.resolve(product))
    const result = await productsService.getById('prod-1')
    expect(result!.name).toBe('Vaso artesanal')
  })
})

describe('productsService.create', () => {
  test('crea producto con precios normalizados a 2 decimales', async () => {
    mockCategoriesRepo.findById.mockReturnValueOnce(
      Promise.resolve(activeCategory),
    )
    mockProductsRepo.createWithInitialStock.mockReturnValueOnce(Promise.resolve(product))
    const result = await productsService.create(validInput)
    expect(result).toEqual(product)
    const created = mockProductsRepo.createWithInitialStock.mock.calls[0]?.[0] as {
      product: { salePriceCents: number; costPriceCents: number }
      stockQuantity: number
    }
    expect(created.product.salePriceCents).toBe(12000)
    expect(created.product.costPriceCents).toBe(6000)
    expect(created.stockQuantity).toBe(10)
  })

  test('rechaza nombre vacío', async () => {
    expect(
      productsService.create({ ...validInput, name: '   ' }),
    ).rejects.toBeInstanceOf(AppError)
  })

  test('rechaza categoría inexistente', async () => {
    expect(productsService.create(validInput)).rejects.toMatchObject({
      code: 'INVALID_REFERENCE',
      statusCode: 422,
    })
  })

  test('rechaza categoría inactiva', async () => {
    mockCategoriesRepo.findById.mockReturnValueOnce(
      Promise.resolve({ ...activeCategory, active: false }),
    )
    expect(productsService.create(validInput)).rejects.toMatchObject({
      code: 'INVALID_REFERENCE',
    })
  })

  test('rechaza precios negativos', async () => {
    mockCategoriesRepo.findById.mockReturnValueOnce(
      Promise.resolve(activeCategory),
    )
    expect(productsService.create({ ...validInput, salePrice: -1 })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  test('rechaza cantidad decimal', async () => {
    mockCategoriesRepo.findById.mockReturnValueOnce(
      Promise.resolve(activeCategory),
    )
    expect(
      productsService.create({ ...validInput, stockQuantity: 2.5 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  test('rechaza cantidad negativa', async () => {
    mockCategoriesRepo.findById.mockReturnValueOnce(
      Promise.resolve(activeCategory),
    )
    expect(
      productsService.create({ ...validInput, minimumStock: -1 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})

describe('productsService.update', () => {
  test('actualiza un producto existente', async () => {
    mockProductsRepo.findById.mockReturnValueOnce(Promise.resolve(product))
    mockCategoriesRepo.findById.mockReturnValueOnce(
      Promise.resolve(activeCategory),
    )
    mockProductsRepo.update.mockReturnValueOnce(
      Promise.resolve({ ...product, name: 'Vaso grande' }),
    )
    const result = await productsService.update('prod-1', {
      ...validInput,
      name: 'Vaso grande',
    })
    expect(result!.name).toBe('Vaso grande')
  })

  test('devuelve NOT_FOUND si no existe', async () => {
    expect(productsService.update('nope', validInput)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  test('rechaza asignar a categoría inactiva', async () => {
    mockProductsRepo.findById.mockReturnValueOnce(Promise.resolve(product))
    mockCategoriesRepo.findById.mockReturnValueOnce(
      Promise.resolve({ ...activeCategory, active: false }),
    )
    expect(productsService.update('prod-1', validInput)).rejects.toMatchObject({
      code: 'INVALID_REFERENCE',
    })
  })
})

describe('productsService.setActive', () => {
  test('desactiva un producto', async () => {
    mockProductsRepo.findById.mockReturnValueOnce(Promise.resolve(product))
    mockProductsRepo.update.mockReturnValueOnce(
      Promise.resolve({ ...product, active: false }),
    )
    const result = await productsService.setActive('prod-1', false)
    expect(result!.active).toBe(false)
  })

  test('devuelve NOT_FOUND si no existe', async () => {
    expect(productsService.setActive('nope', true)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('productsService.remove', () => {
  test('rechaza sin confirmación', async () => {
    expect(productsService.remove('prod-1', false)).rejects.toMatchObject({
      code: 'CONFIRMATION_REQUIRED',
      statusCode: 400,
    })
  })

  test('hace eliminación lógica con confirmación', async () => {
    mockProductsRepo.findById.mockReturnValueOnce(Promise.resolve(product))
    mockProductsRepo.update.mockReturnValueOnce(
      Promise.resolve({ ...product, active: false }),
    )
    const result = await productsService.remove('prod-1', true)
    expect(result!.active).toBe(false)
  })

  test('devuelve NOT_FOUND si no existe', async () => {
    expect(productsService.remove('nope', true)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  test('registro ya inactivo es idempotente', async () => {
    const inactive = { ...product, active: false }
    mockProductsRepo.findById.mockReturnValueOnce(Promise.resolve(inactive))
    const result = await productsService.remove('prod-1', true)
    expect(result).toEqual(inactive)
    expect(mockProductsRepo.update).not.toHaveBeenCalled()
  })
})
