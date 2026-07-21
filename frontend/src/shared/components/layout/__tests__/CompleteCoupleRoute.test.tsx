import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { CompleteCoupleRoute } from '../CompleteCoupleRoute'
import { GuestRoute } from '../GuestRoute'
import { useAuthStore } from '@/shared/stores/auth.store'
import type { CoupleState } from '@/core/types/api.types'

const signIn = (coupleState: CoupleState) =>
  useAuthStore.setState({ isAuthenticated: true, coupleState })

const renderAt = (path: string, element: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="/waiting" element={<p>Waiting for your person</p>} />
        <Route path="/dashboard" element={<p>Dashboard</p>} />
        <Route path="/login" element={<p>Welcome home</p>} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: false, coupleState: null })
})

describe('CompleteCoupleRoute', () => {
  it('lets a complete couple through', () => {
    signIn('Complete')
    renderAt('/dashboard-test', <CompleteCoupleRoute><p>Dashboard</p></CompleteCoupleRoute>)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('sends an awaiting registrant to the threshold', () => {
    signIn('AwaitingPartner')
    renderAt('/dashboard-test', <CompleteCoupleRoute><p>Dashboard</p></CompleteCoupleRoute>)

    expect(screen.getByText('Waiting for your person')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})

describe('GuestRoute', () => {
  it('shows the login page to a visitor', () => {
    renderAt('/login-test', <GuestRoute><p>Welcome home</p></GuestRoute>)

    expect(screen.getByText('Welcome home')).toBeInTheDocument()
  })

  it('sends a complete couple to the dashboard', () => {
    signIn('Complete')
    renderAt('/login-test', <GuestRoute><p>Welcome home</p></GuestRoute>)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('sends an awaiting registrant to the threshold, not the dashboard', () => {
    // Redirecting to /dashboard here would bounce straight back via CompleteCoupleRoute —
    // a guard loop. This test exists to keep that from creeping back in.
    signIn('AwaitingPartner')
    renderAt('/login-test', <GuestRoute><p>Welcome home</p></GuestRoute>)

    expect(screen.getByText('Waiting for your person')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})
