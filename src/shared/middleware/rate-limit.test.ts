import { describe, expect, test } from 'bun:test'
import { AppError } from '../errors/app-error'
import { InMemoryRateLimiter, enforceRateLimit } from './rate-limit'

describe('InMemoryRateLimiter', () => {
  test('rechaza después del límite y calcula Retry-After', () => {
    const limiter = new InMemoryRateLimiter({ limit: 2, windowMs: 60_000, name: 'test' })
    limiter.check('127.0.0.1', 100_000)
    limiter.check('127.0.0.1', 100_001)

    expect(() => limiter.check('127.0.0.1', 100_002)).toThrow(AppError)
    try {
      limiter.check('127.0.0.1', 100_002)
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 429, details: { retryAfter: 60 } })
    }

    expect(() => limiter.check('127.0.0.1', 160_002)).not.toThrow()
  })

  test('separa clientes por IP y usa unknown como fallback', () => {
    const limiter = new InMemoryRateLimiter({ limit: 1, windowMs: 60_000, name: 'test' })
    enforceRateLimit(new Request('http://localhost'), limiter)
    expect(() => enforceRateLimit(new Request('http://localhost'), limiter)).toThrow(AppError)
    expect(() => enforceRateLimit(new Request('http://localhost', { headers: { 'x-forwarded-for': '10.0.0.2' } }), limiter)).not.toThrow()
  })
})