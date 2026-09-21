import { describe, expect, test } from 'bun:test'
import { createEnvConfig } from './env'

describe('createEnvConfig', () => {
  test('valida variables requeridas y aplica defaults para desarrollo', () => {
    const env = createEnvConfig({
      PORT: '3000',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/artesanias',
      JWT_SECRET: 'super-secret',
      JWT_EXPIRES_IN: '7d',
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://localhost:3000',
    })

    expect(env.PORT).toBe(3000)
    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/artesanias')
    expect(env.JWT_EXPIRES_IN).toBe('7d')
    expect(env.NODE_ENV).toBe('development')
    expect(env.CORS_ORIGIN).toBe('http://localhost:3000')
    expect(env.AUTH_REGISTRATION_ENABLED).toBe(false)
    expect(env.AUTH_BOOTSTRAP_TOKEN).toBeUndefined()
  })

  test('exige token de bootstrap cuando se habilita el registro', () => {
    expect(() => createEnvConfig({
      NODE_ENV: 'development',
      AUTH_REGISTRATION_ENABLED: 'true',
    })).toThrow('AUTH_BOOTSTRAP_TOKEN')
  })

  test('permite bootstrap con token suficientemente largo', () => {
    const env = createEnvConfig({
      NODE_ENV: 'development',
      AUTH_REGISTRATION_ENABLED: 'true',
      AUTH_BOOTSTRAP_TOKEN: 'a'.repeat(32),
    })

    expect(env.AUTH_REGISTRATION_ENABLED).toBe(true)
    expect(env.AUTH_BOOTSTRAP_TOKEN).toBe('a'.repeat(32))
  })

  test('rechaza una contraseña inexistente para JWT', () => {
    expect(() =>
      createEnvConfig({
        PORT: '3000',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/artesanias',
        JWT_SECRET: '',
        JWT_EXPIRES_IN: '7d',
        NODE_ENV: 'development',
        CORS_ORIGIN: 'http://localhost:3000',
      }),
    ).toThrow()
  })

  test('exige SSL de base de datos en producción', () => {
    expect(() => createEnvConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(32),
      CORS_ORIGIN: 'https://artesanias.example.com',
    })).toThrow('DATABASE_SSL=require')
  })

  test('rechaza CORS abierto en producción', () => {
    expect(() => createEnvConfig({
      NODE_ENV: 'production',
      DATABASE_SSL: 'require',
      JWT_SECRET: 'a'.repeat(32),
      CORS_ORIGIN: '*',
    })).toThrow('CORS_ORIGIN')
  })
})
