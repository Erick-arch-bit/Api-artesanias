import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { categoriesService } from './categories.service'
import { AppError } from '../../shared/errors/app-error'

type Category = {
  id: string
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const mockRepo = {
  findActive: mock(() => Promise.resolve([] as Category[])),
  findAll: mock(() => Promise.resolve([] as Category[])),
  findById: mock((_id: string) => Promise.resolve(undefined as Category | undefined)),
  findByName: mock((_name: string) =>
    Promise.resolve(undefined as Category | undefined),
  ),
  findByNameExcludingId: mock((_name: string, _id: string) =>
    Promise.resolve(undefined as Category | undefined),
  ),
  create: mock((_name: string) =>
    Promise.resolve(undefined as Category | undefined),
  ),
  update: mock((_id: string, _data: { name: string }) =>
    Promise.resolve(undefined as Category | undefined),
  ),
  setActive: mock((_id: string, _active: boolean) =>
    Promise.resolve(undefined as Category | undefined),
  ),
}

mock.module('./categories.repository', () => ({
  categoriesRepository: mockRepo,
}))

const category: Category = {
  id: 'cat-1',
  name: 'Vasos',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  mockRepo.findActive.mockReset()
  mockRepo.findAll.mockReset()
  mockRepo.findById.mockReset()
  mockRepo.findByName.mockReset()
  mockRepo.findByNameExcludingId.mockReset()
  mockRepo.create.mockReset()
  mockRepo.update.mockReset()
  mockRepo.setActive.mockReset()
})

describe('categoriesService.list', () => {
  test('list devuelve categorías activas por defecto', async () => {
    mockRepo.findActive.mockReturnValueOnce(Promise.resolve([category]))
    const result = await categoriesService.list(false)
    expect(result).toHaveLength(1)
    expect(mockRepo.findActive).toHaveBeenCalled()
  })

  test('list con includeInactive=true usa findAll', async () => {
    mockRepo.findAll.mockReturnValueOnce(Promise.resolve([category]))
    const result = await categoriesService.list(true)
    expect(result).toHaveLength(1)
    expect(mockRepo.findAll).toHaveBeenCalled()
  })
})

describe('categoriesService.create', () => {
  test('crea una categoría con nombre normalizado', async () => {
    mockRepo.create.mockReturnValueOnce(Promise.resolve(category))
    const result = await categoriesService.create('  Vasos  ')
    expect(result).toEqual(category)
    expect(mockRepo.create).toHaveBeenCalledWith('Vasos')
  })

  test('rechaza nombre vacío tras normalizar', async () => {
    expect(categoriesService.create('   ')).rejects.toBeInstanceOf(AppError)
  })

  test('rechaza categoría duplicada insensible a mayúsculas', async () => {
    mockRepo.findByName.mockReturnValueOnce(Promise.resolve(category))
    expect(categoriesService.create('VASOS')).rejects.toMatchObject({
      code: 'DUPLICATE_ENTRY',
      statusCode: 409,
    })
  })
})

describe('categoriesService.getById', () => {
  test('devuelve NOT_FOUND si no existe', async () => {
    expect(categoriesService.getById('nope')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    })
  })

  test('devuelve la categoría si existe', async () => {
    mockRepo.findById.mockReturnValueOnce(Promise.resolve(category))
    const result = await categoriesService.getById('cat-1')
    expect(result.name).toBe('Vasos')
  })
})

describe('categoriesService.update', () => {
  test('actualiza nombre normalizado', async () => {
    mockRepo.findById.mockReturnValueOnce(Promise.resolve(category))
    mockRepo.update.mockReturnValueOnce(
      Promise.resolve({ ...category, name: 'Platos' }),
    )
    const result = await categoriesService.update('cat-1', '  Platos  ')
    expect(result!.name).toBe('Platos')
  })

  test('rechaza actualizar a un nombre duplicado', async () => {
    mockRepo.findById.mockReturnValueOnce(Promise.resolve(category))
    mockRepo.findByNameExcludingId.mockReturnValueOnce(Promise.resolve(category))
    expect(categoriesService.update('cat-1', 'Duplicado')).rejects.toMatchObject({
      code: 'DUPLICATE_ENTRY',
    })
  })

  test('devuelve NOT_FOUND si no existe', async () => {
    expect(categoriesService.update('nope', 'Nombre')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('categoriesService.setActive', () => {
  test('activa la categoría', async () => {
    mockRepo.findById.mockReturnValueOnce(Promise.resolve(category))
    mockRepo.setActive.mockReturnValueOnce(
      Promise.resolve({ ...category, active: true }),
    )
    const result = await categoriesService.setActive('cat-1', true)
    expect(result!.active).toBe(true)
  })

  test('devuelve NOT_FOUND si no existe', async () => {
    expect(categoriesService.setActive('nope', false)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('categoriesService.remove', () => {
  test('rechaza sin confirmación', async () => {
    expect(categoriesService.remove('cat-1', false)).rejects.toMatchObject({
      code: 'CONFIRMATION_REQUIRED',
      statusCode: 400,
    })
  })

  test('rechaza con confirmación falsa', async () => {
    expect(categoriesService.remove('cat-1', false)).rejects.toMatchObject({
      code: 'CONFIRMATION_REQUIRED',
    })
  })

  test('hace eliminación lógica con confirmación', async () => {
    mockRepo.findById.mockReturnValueOnce(Promise.resolve(category))
    mockRepo.setActive.mockReturnValueOnce(
      Promise.resolve({ ...category, active: false }),
    )
    const result = await categoriesService.remove('cat-1', true)
    expect(result!.active).toBe(false)
  })

  test('devuelve NOT_FOUND si no existe', async () => {
    expect(categoriesService.remove('nope', true)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  test('registro ya inactivo es idempotente', async () => {
    const inactive = { ...category, active: false }
    mockRepo.findById.mockReturnValueOnce(Promise.resolve(inactive))
    const result = await categoriesService.remove('cat-1', true)
    expect(result).toEqual(inactive)
    expect(mockRepo.setActive).not.toHaveBeenCalled()
  })
})
