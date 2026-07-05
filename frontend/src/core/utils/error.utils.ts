import { AxiosError } from 'axios'
import type { ApiError } from '@/core/types/api.types'

export function extractApiError(error: unknown): ApiError {
  if (error instanceof AxiosError && error.response?.data) {
    return error.response.data as ApiError
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again.',
  }
}

export function getFieldErrors(error: unknown): Record<string, string> {
  const apiError = extractApiError(error)
  if (!apiError.errors) return {}

  return Object.fromEntries(
    Object.entries(apiError.errors).map(([key, messages]) => [
      key.charAt(0).toLowerCase() + key.slice(1),
      messages[0] ?? '',
    ]),
  )
}
