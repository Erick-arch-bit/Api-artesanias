export type ErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_ENTRY'
  | 'CONFIRMATION_REQUIRED'
  | 'FOREIGN_KEY_VIOLATION'
  | 'INVALID_REFERENCE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details: Record<string, unknown>

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 400,
    details: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  static notFound(message: string) {
    return new AppError('NOT_FOUND', message, 404)
  }

  static validation(message: string, details: Record<string, unknown> = {}) {
    return new AppError('VALIDATION_ERROR', message, 422, details)
  }

  static duplicate(message: string) {
    return new AppError('DUPLICATE_ENTRY', message, 409)
  }

  static confirmationRequired(message: string) {
    return new AppError('CONFIRMATION_REQUIRED', message, 400)
  }

  static invalidReference(message: string) {
    return new AppError('INVALID_REFERENCE', message, 422)
  }

  static unauthorized(message: string) {
    return new AppError('UNAUTHORIZED', message, 401)
  }

  static forbidden(message: string) {
    return new AppError('FORBIDDEN', message, 403)
  }

  static rateLimited(message: string, retryAfter: number) {
    return new AppError('RATE_LIMITED', message, 429, { retryAfter })
  }

  static internal(message: string = 'Error interno del servidor') {
    return new AppError('INTERNAL_ERROR', message, 500)
  }
}
