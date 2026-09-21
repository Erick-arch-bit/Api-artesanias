import { AppError } from '../errors/app-error'

interface RateLimitOptions {
  limit: number
  windowMs: number
  name: string
}

interface RateLimitState {
  timestamps: number[]
}

export class InMemoryRateLimiter {
  private readonly states = new Map<string, RateLimitState>()

  constructor(private readonly options: RateLimitOptions) {}

  check(key: string, now = Date.now()) {
    const windowStart = now - this.options.windowMs
    const state = this.states.get(key) ?? { timestamps: [] }
    state.timestamps = state.timestamps.filter((timestamp) => timestamp > windowStart)

    if (state.timestamps.length >= this.options.limit) {
      const retryAfter = Math.max(1, Math.ceil((state.timestamps[0]! + this.options.windowMs - now) / 1000))
      throw AppError.rateLimited('Demasiadas solicitudes. Intenta de nuevo más tarde.', retryAfter)
    }

    state.timestamps.push(now)
    this.states.set(key, state)
  }

  reset() {
    this.states.clear()
  }
}

export function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

export function enforceRateLimit(request: Request, limiter: InMemoryRateLimiter) {
  limiter.check(getClientIp(request))
}

export const authRateLimiter = new InMemoryRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000, name: 'auth' })
export const paymentRateLimiter = new InMemoryRateLimiter({ limit: 30, windowMs: 15 * 60 * 1000, name: 'payments' })