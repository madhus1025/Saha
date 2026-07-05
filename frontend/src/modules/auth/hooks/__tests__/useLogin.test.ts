import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLogin } from '../useLogin'
import { useAuthStore } from '@/shared/stores/auth.store'
import { createWrapper } from '@/test-utils/query-wrapper'
import type { LoginResponseDto } from '@/core/types/api.types'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/core/api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

vi.mock('@/shared/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

const mockLoginResponse: LoginResponseDto = {
  accessToken: 'mock.access.token',
  expiresAt: '2026-06-29T01:00:00Z',
  coupleId: 'couple-123',
  partnerId: 'partner-456',
  username: 'testhusbnd',
  partnerName: 'Test Wife',
  togetherID: 'TEST-ID01',
  role: 'Husband',
  profilePictureUrl: null,
}

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('should call login API and set auth data on success', async () => {
    const { authApi } = await import('@/core/api/auth.api')
    vi.mocked(authApi.login).mockResolvedValueOnce(mockLoginResponse)

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync({ username: 'testhusbnd', password: 'SecurePass@123!' })
    })

    expect(authApi.login).toHaveBeenCalledWith({
      username: 'testhusbnd',
      password: 'SecurePass@123!',
    })

    const authState = useAuthStore.getState()
    expect(authState.isAuthenticated).toBe(true)
    expect(authState.coupleId).toBe('couple-123')
    expect(authState.togetherID).toBe('TEST-ID01')

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
  })

  it('should not navigate on error', async () => {
    const { authApi } = await import('@/core/api/auth.api')
    vi.mocked(authApi.login).mockRejectedValueOnce(
      Object.assign(new Error('Request failed with status code 401'), {
        response: { status: 401, data: { message: 'Invalid credentials' } },
      }),
    )

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() })

    await act(async () => {
      try {
        await result.current.mutateAsync({ username: 'wrong', password: 'WrongPass@1' })
      } catch {
        // expected
      }
    })

    const authState = useAuthStore.getState()
    expect(authState.isAuthenticated).toBe(false)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should expose isPending state during mutation', async () => {
    const { authApi } = await import('@/core/api/auth.api')
    let resolveFn!: (value: LoginResponseDto) => void
    vi.mocked(authApi.login).mockReturnValueOnce(
      new Promise<LoginResponseDto>((resolve) => {
        resolveFn = resolve
      }),
    )

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() })

    // Trigger mutation without awaiting so it stays pending
    result.current.mutate({ username: 'testhusbnd', password: 'SecurePass@123!' })

    // Wait for TanStack Query to set isPending = true
    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })

    // Resolve the deferred promise and wait for the mutation to settle
    resolveFn(mockLoginResponse)
    await waitFor(() => {
      expect(result.current.isPending).toBe(false)
    })
  })
})
