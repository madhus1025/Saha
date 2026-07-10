import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { authApi } from '@/core/api/auth.api'
import { useAuthStore } from '@/shared/stores/auth.store'
import { extractApiError } from '@/core/utils/error.utils'
import { toast } from '@/shared/hooks/use-toast'
import { telemetry } from '@/core/telemetry/telemetry.service'
import { LOGIN_BUTTON_CLICKED } from '@/core/telemetry/events'
import type { LoginFormValues } from '../schemas/login.schema'

export function useLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setAuthData = useAuthStore((s) => s.setAuthData)

  return useMutation({
    mutationFn: (values: LoginFormValues) => {
      // Record the button click the moment the mutation fires
      telemetry.track(LOGIN_BUTTON_CLICKED)
      return authApi.login(values)
    },
    onSuccess: (data) => {
      // Clear any cached queries from a previously signed-in account before this couple's data
      // loads, so a same-tab account switch never surfaces the prior couple's conversations.
      queryClient.clear()
      setAuthData(data)
      // After login, attach the partner ID to future telemetry events
      telemetry.identify(data.partnerId)

      // A registrant whose partner has not yet accepted reaches the threshold, never a module.
      navigate(data.coupleState === 'AwaitingPartner' ? '/waiting' : '/dashboard', { replace: true })
    },
    onError: (error) => {
      const apiError = extractApiError(error)
      toast({
        title: 'Login failed',
        description: apiError.message,
        variant: 'error',
      })
    },
  })
}
