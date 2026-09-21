import { describe, expect, test } from 'bun:test'
import { requireRole } from './auth'

describe('requireRole', () => {
  test('permite a un vendedor acceder a una operación de catálogo', () => {
    const user = { id: 'seller-1', role: 'seller' }

    expect(requireRole(['admin', 'seller'])({ user })).toBe(user)
  })

  test('rechaza a un usuario familiar en una operación de catálogo', () => {
    expect(() => requireRole(['admin', 'seller'])({ user: { id: 'family-1', role: 'family' } }))
      .toThrow('permisos')
  })
})