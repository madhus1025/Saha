import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/core/api/auth.api'
import { queryKeys } from '@/core/constants/query-keys'

const DEBOUNCE_MS = 400

function useDebounced<T>(value: T, delayMs = DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

interface UseAvailabilityOptions {
  field: 'username' | 'togetherId'
  value: string
  /** Only ask the server once the value is syntactically plausible. */
  enabled: boolean
}

/**
 * A convenience check, never the correctness boundary — uniqueness is decided by the unique index
 * when the couple is created. So a failed check must not block submission (spec edge case 4).
 */
export function useAvailability({ field, value, enabled }: UseAvailabilityOptions) {
  const debouncedValue = useDebounced(value)
  const active = enabled && debouncedValue === value && value.length > 0

  const query = useQuery({
    queryKey: queryKeys.auth.availability(field, debouncedValue),
    queryFn: () =>
      authApi.checkAvailability(
        field === 'username' ? { username: debouncedValue } : { togetherId: debouncedValue },
      ),
    enabled: active,
    staleTime: 0,
    retry: false,
  })

  const available =
    field === 'username' ? query.data?.usernameAvailable : query.data?.togetherIDAvailable

  return {
    /** `undefined` means "no verdict" — still typing, checking, or the check failed. */
    available: query.isError ? undefined : (available ?? undefined),
    isChecking: active && query.isFetching,
    /** True when the check itself failed. The form stays submittable. */
    checkFailed: query.isError,
  }
}
