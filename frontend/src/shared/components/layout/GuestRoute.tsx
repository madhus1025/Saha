import { Navigate } from 'react-router'
import { useAuthStore } from '@/shared/stores/auth.store'

interface GuestRouteProps {
  children: React.ReactNode
  /**
   * Where an authenticated registrant whose partner hasn't arrived should go.
   *
   * The register route overrides this to `/invite`. When registration succeeds it flips the auth
   * state and navigates imperatively; if this guard disagreed about the destination, whichever
   * redirect landed last would win — and the user would end up somewhere neither intended.
   */
  awaitingRedirect?: string
}

export function GuestRoute({ children, awaitingRedirect = '/waiting' }: GuestRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const coupleState = useAuthStore((s) => s.coupleState)

  if (isAuthenticated) {
    // Sending an awaiting registrant to /dashboard would bounce them straight back here via
    // CompleteCoupleRoute.
    return <Navigate to={coupleState === 'AwaitingPartner' ? awaitingRedirect : '/dashboard'} replace />
  }

  return <>{children}</>
}
