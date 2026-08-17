import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAuthStore } from '../auth.store'

const baseAuthData = {
  accessToken: 'eyJ.test.token',
  expiresAt: '2026-06-29T01:00:00Z',
  coupleId: 'couple-uuid-123',
  partnerId: 'partner-uuid-456',
  username: 'madhuavinash',
  partnerName: 'Madhu Avinash',
  togetherID: 'MADHU-PRIYA',
  role: 'Husband' as const,
  profilePictureUrl: null,
  coupleState: 'Complete' as const,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
    localStorage.clear()
  })

  it('should have empty initial state', () => {
    const state = useAuthStore.getState()

    expect(state.isAuthenticated).toBe(false)
    expect(state.accessToken).toBeNull()
    expect(state.coupleId).toBeNull()
    expect(state.partnerId).toBeNull()
    expect(state.username).toBeNull()
    expect(state.togetherID).toBeNull()
    expect(state.role).toBeNull()
  })

  it('should set auth data correctly', () => {
    act(() => {
      useAuthStore.getState().setAuthData(baseAuthData)
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.accessToken).toBe('eyJ.test.token')
    expect(state.coupleId).toBe('couple-uuid-123')
    expect(state.partnerId).toBe('partner-uuid-456')
    expect(state.username).toBe('madhuavinash')
    expect(state.togetherID).toBe('MADHU-PRIYA')
    expect(state.role).toBe('Husband')
    expect(state.partnerName).toBe('Madhu Avinash')
  })

  it('should clear auth state on logout', () => {
    act(() => {
      useAuthStore.getState().setAuthData(baseAuthData)
    })

    act(() => {
      useAuthStore.getState().logout()
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.accessToken).toBeNull()
    expect(state.coupleId).toBeNull()
    expect(state.username).toBeNull()
  })

  it('should update access token independently', () => {
    act(() => {
      useAuthStore.getState().setAuthData(baseAuthData)
    })

    act(() => {
      useAuthStore.getState().setAccessToken('new.refreshed.token')
    })

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('new.refreshed.token')
    expect(state.coupleId).toBe('couple-uuid-123')
    expect(state.isAuthenticated).toBe(true)
  })

  it('should not persist accessToken to localStorage', () => {
    act(() => {
      useAuthStore.getState().setAuthData(baseAuthData)
    })

    const stored = localStorage.getItem('saha-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      expect(parsed?.state?.accessToken).toBeUndefined()
    }
  })

  it('should persist non-sensitive session fields to localStorage', () => {
    act(() => {
      useAuthStore.getState().setAuthData(baseAuthData)
    })

    const stored = localStorage.getItem('saha-auth')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed?.state?.coupleId).toBe('couple-uuid-123')
    expect(parsed?.state?.username).toBe('madhuavinash')
    expect(parsed?.state?.isAuthenticated).toBe(true)
  })
})
