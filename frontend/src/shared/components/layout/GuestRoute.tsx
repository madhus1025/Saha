import { Navigate } from 'react-router'
import { useAuthStore } from '@/shared/stores/auth.store'

interface GuestRouteProps {
  children: React.ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
