import { describe, test, expect } from 'bun:test'
import { app } from './app'

async function call(path: string, init?: RequestInit) {
  const res = await app.handle(new Request(`http://localhost${path}`, init))
  const body = (await res.json()) as {
    success: boolean
    data: unknown
    error: { code: string; message: string; details: unknown } | null
    meta: unknown
  }
  return { status: res.status, body }
}

describe('GET /health', () => {
  test('responde ok con formato uniforme', async () => {
    const { status, body } = await call('/health')
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.error).toBeNull()
    expect(body.data).toEqual({ status: 'ok', service: 'api-artesanias' })
  })
})

describe('rutas inexistentes', () => {
  test('devuelven 404 con formato uniforme', async () => {
    const { status, body } = await call('/api/no-existe')
    expect(status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.data).toBeNull()
    expect(body.error!.code).toBe('NOT_FOUND')
  })
})

describe('módulos de negocio montados', () => {
  test('GET /api/v1/sales responde sin depender de DB', async () => {
    const { status, body } = await call('/api/v1/sales')

    expect(status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error!.code).toBe('UNAUTHORIZED')
  })

  test('GET /api/v1/orders responde sin depender de DB', async () => {
    const { status, body } = await call('/api/v1/orders')

    expect(status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error!.code).toBe('UNAUTHORIZED')
  })

  test('GET /api/v1/customers responde sin depender de DB', async () => {
    const { status, body } = await call('/api/v1/customers')

    expect(status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error!.code).toBe('UNAUTHORIZED')
  })

  test('POST /api/v1/auth/logout exige un token', async () => {
    const { status, body } = await call('/api/v1/auth/logout', { method: 'POST' })

    expect(status).toBe(401)
    expect(body.error!.code).toBe('UNAUTHORIZED')
  })

  test('GET /api/v1/inventory/movements exige un token', async () => {
    const { status, body } = await call('/api/v1/inventory/movements')

    expect(status).toBe(401)
    expect(body.error!.code).toBe('UNAUTHORIZED')
  })
})

describe('registro de autenticación', () => {
  test('permanece deshabilitado por defecto y no expone registro admin', async () => {
    const { status, body } = await call('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Admin', email: 'admin@example.com', password: 'password123' }),
    })

    expect(status).toBe(404)
    expect(body.error!.code).toBe('NOT_FOUND')
  })
})

describe('formato uniforme de errores de validación (sin DB)', () => {
  test('POST /api/v1/categories sin nombre devuelve 422 uniforme', async () => {
    const { status, body } = await call('/api/v1/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(status).toBe(422)
    expect(body.success).toBe(false)
    expect(body.data).toBeNull()
    expect(body.error!.code).toBe('VALIDATION_ERROR')
    expect(body.meta).toBeNull()
  })

  test('POST /api/v1/products con precio negativo devuelve 422 uniforme', async () => {
    const { status, body } = await call('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vaso',
        categoryId: '00000000-0000-0000-0000-000000000000',
        salePrice: -5,
        costPrice: 10,
        stockQuantity: 1,
        minimumStock: 0,
      }),
    })
    expect(status).toBe(422)
    expect(body.success).toBe(false)
    expect(body.data).toBeNull()
    expect(body.error!.code).toBe('VALIDATION_ERROR')
  })

  test('POST /api/v1/products con stock decimal devuelve 422 uniforme', async () => {
    const { status, body } = await call('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vaso',
        categoryId: '00000000-0000-0000-0000-000000000000',
        salePrice: 10,
        costPrice: 5,
        stockQuantity: 2.5,
        minimumStock: 0,
      }),
    })
    expect(status).toBe(422)
    expect(body.success).toBe(false)
    expect(body.error!.code).toBe('VALIDATION_ERROR')
  })

  test('GET /api/v1/categories con id no-uuid devuelve 422 uniforme', async () => {
    const { status, body } = await call('/api/v1/categories/{{categoryId}}')
    expect(status).toBe(422)
    expect(body.success).toBe(false)
    expect(body.data).toBeNull()
    expect(body.error!.code).toBe('VALIDATION_ERROR')
  })

  test('GET /api/v1/products con id no-uuid devuelve 422 uniforme', async () => {
    const { status, body } = await call('/api/v1/products/no-es-uuid')
    expect(status).toBe(422)
    expect(body.success).toBe(false)
    expect(body.error!.code).toBe('VALIDATION_ERROR')
  })
})
