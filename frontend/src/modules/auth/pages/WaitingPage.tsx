import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/core/api/auth.api'
import { queryKeys } from '@/core/constants/query-keys'
import { useAuthStore } from '@/shared/stores/auth.store'
import { Button } from '@/shared/components/ui/Button'
import { telemetry } from '@/core/telemetry/telemetry.service'

/**
 * The threshold. Not an error state — the deck frames waiting as anticipation, so nothing here is
 * red and nothing apologises.
 *
 * The registrant's access token predates their partner's acceptance, so couple state is polled from
 * the API rather than read from the token (DL-4).
 */
export function WaitingPage() {
  const navigate = useNavigate()
  const togetherID = useAuthStore((s) => s.togetherID)
  const setCoupleState = useAuthStore((s) => s.setCoupleState)

  useEffect(() => {
    telemetry.track('auth.waiting_threshold_viewed')
  }, [])

  const { data } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: authApi.getSession,
    refetchInterval: 15_000,
    // Stop hammering the API while the tab is in the background.
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    if (data?.coupleState !== 'Complete') return

    setCoupleState('Complete')
    navigate('/dashboard', { replace: true })
  }, [data?.coupleState, setCoupleState, navigate])

  return (
    <div className="space-y-8 text-center">
      <div>
        <h1 className="font-display text-3xl font-medium text-sandstone-900 dark:text-cream-200">
          Waiting for your person
        </h1>
        <p className="mt-1.5 text-sandstone-600 dark:text-sandstone-400">
          Your home at <span className="font-mono">{togetherID}</span> is ready. It opens when
          you’re both here.
        </p>
      </div>

      <div className="rounded-2xl bg-sandstone-50 dark:bg-sandstone-900/50 p-6 text-sm text-sandstone-600 dark:text-sandstone-400">
        We’ll let you in the moment they accept their invitation.
      </div>

      <Button variant="ghost" className="w-full" onClick={() => navigate('/invite')}>
        Manage the invitation
      </Button>
    </div>
  )
}
