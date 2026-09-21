export interface SuccessResponse<T> {
  success: true
  data: T
  error: null
  meta: null
}

export interface ErrorResponse {
  success: false
  data: null
  error: {
    code: string
    message: string
    details: Record<string, unknown>
  }
  meta: null
}

export function successResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: null,
  }
}

export function errorResponse(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): ErrorResponse {
  return {
    success: false,
    data: null,
    error: { code, message, details },
    meta: null,
  }
}
