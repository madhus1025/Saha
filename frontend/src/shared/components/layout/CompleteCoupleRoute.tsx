import { Navigate } from 'react-router'
import { useAuthStore } from '@/shared/stores/auth.store'

interface CompleteCoupleRouteProps {
  children: React.ReactNode
}

/**
 * The home opens when you're both here. A registrant whose partner has not yet accepted reaches the
 * waiting threshold, never a module.
 *
 * This is presentation only — the backend enforces the same rule independently on every couple-scoped
 * handler. Do not treat it as the security boundary.
 */
export function CompleteCoupleRoute({ children }: CompleteCoupleRouteProps) {
  const coupleState = useAuthStore((s) => s.coupleState)

  if (coupleState === 'AwaitingPartner') {
    return <Navigate to="/waiting" replace />
  }

  return <>{children}</>
}
