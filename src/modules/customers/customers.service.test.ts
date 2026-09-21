import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { customersService } from './customers.service'
import { AppError } from '../../shared/errors/app-error'

type Customer = {
  id: string
  name: string
  phone: string
  neighborhood: string | null
  frequentDeliveryPoint: string | null
  notes: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const mockRepo = {
  findAll: mock(() => Promise.resolve([] as Customer[])),
  findById: mock((_id: string) => Promise.resolve(undefined as Customer | undefined)),
  create: mock((_data: Record<string, unknown>) => Promise.resolve(undefined as Customer | undefined)),
  update: mock((_id: string, _data: Partial<Customer>) => Promise.resolve(undefined as Customer | undefined)),
}

mock.module('./customers.repository', () => ({
  customersRepository: mockRepo,
}))

const customer: Customer = {
  id: 'cust-1',
  name: 'Ana',
  phone: '5551234',
  neighborhood: 'Centro',
  frequentDeliveryPoint: 'Frente al parque',
  notes: 'Cliente frecuente',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  mockRepo.findAll.mockReset()
  mockRepo.findById.mockReset()
  mockRepo.create.mockReset()
  mockRepo.update.mockReset()
})

describe('customersService.create', () => {
  test('normaliza nombre y teléfono y valida nombre obligatorio', async () => {
    mockRepo.create.mockReturnValueOnce(Promise.resolve(customer))

    const value = await customersService.create({
      name: '  Ana  ',
      phone: '  5551234  ',
      neighborhood: 'Centro',
      frequentDeliveryPoint: 'Frente al parque',
      notes: 'Cliente frecuente',
    })

    expect(value).toEqual(customer)
    expect(mockRepo.create).toHaveBeenCalledWith({
      name: 'Ana',
      phone: '5551234',
      neighborhood: 'Centro',
      frequentDeliveryPoint: 'Frente al parque',
      notes: 'Cliente frecuente',
      active: true,
    })
  })

  test('rechaza nombre vacío tras limpiar', async () => {
    await expect(
      customersService.create({
        name: '   ',
        phone: '5551234',
      }),
    ).rejects.toBeInstanceOf(AppError)
  })
})
