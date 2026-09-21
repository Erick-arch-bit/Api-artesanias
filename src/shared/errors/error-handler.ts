import type { Context } from 'elysia'
import { AppError } from './app-error'

interface ErrorContext {
  code: string | number
  error: unknown
  set: Context['set']
}

function uniformError(code: string, message: string) {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details: {},
    },
    meta: null,
  }
}

export function toErrorResponse({ code, error, set }: ErrorContext) {
  if (error instanceof AppError) {
    set.status = error.statusCode
    if (error.code === 'RATE_LIMITED') {
      set.headers['Retry-After'] = String(error.details.retryAfter)
    }
    return {
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: null,
    }
  }

  const pgError = error as { code?: string; cause?: { code?: string } }
  const pgCode = pgError?.code ?? pgError?.cause?.code
  if (pgCode) {
    if (pgCode === '23505') {
      set.status = 409
      return uniformError('DUPLICATE_ENTRY', 'Ya existe un registro con esos datos')
    }

    if (pgCode === '23503') {
      set.status = 422
      return uniformError(
        'FOREIGN_KEY_VIOLATION',
        'La referencia proporcionada no es válida',
      )
    }

    if (pgCode === '22P02') {
      set.status = 422
      return uniformError(
        'VALIDATION_ERROR',
        'El identificador proporcionado no es válido',
      )
    }
  }

  if (code === 'NOT_FOUND') {
    set.status = 404
    return uniformError('NOT_FOUND', 'Recurso no encontrado')
  }

  if (code === 'VALIDATION') {
    set.status = 422
    return uniformError('VALIDATION_ERROR', 'Los datos enviados no son válidos')
  }

  console.error('Error no manejado:', error)
  set.status = 500
  return uniformError('INTERNAL_ERROR', 'Error interno del servidor')
}
