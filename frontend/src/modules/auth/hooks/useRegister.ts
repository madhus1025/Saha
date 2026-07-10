import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { authApi, type RegisterCoupleRequest } from '@/core/api/auth.api'
import { useAuthStore } from '@/shared/stores/auth.store'
import { extractApiError } from '@/core/utils/error.utils'
import { toast } from '@/shared/hooks/use-toast'
import { telemetry } from '@/core/telemetry/telemetry.service'
import { useRegisterWizard } from './useRegisterWizard'

export function useRegister() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setAuthData = useAuthStore((s) => s.setAuthData)
  const reset = useRegisterWizard((s) => s.reset)
  const returnToStepOne = useRegisterWizard((s) => s.returnToStepOne)

  return useMutation({
    mutationFn: (values: RegisterCoupleRequest) => authApi.register(values),

    onSuccess: (data) => {
      queryClient.clear()
      setAuthData(data)
      telemetry.identify(data.partnerId)
      telemetry.track('auth.couple_created', { role: data.role })

      // The plaintext password lives only in this store. Clear it the moment it is no longer needed.
      reset()

      navigate('/invite', { replace: true })
    },

    onError: (error) => {
      const apiError = extractApiError(error)
      telemetry.track('auth.register.client_error', { error_code: apiError.code ?? 'UNKNOWN' })

      // A username claimed between step 1 and submit belongs back on step 1, with everything intact.
      if (apiError.code === 'USERNAME_TAKEN') {
        returnToStepOne()
      }

      toast({
        title:
          apiError.code === 'TOGETHER_ID_TAKEN'
            ? 'That name is taken'
            : 'We couldn\u2019t open your home',
        description: apiError.message,
        variant: 'error',
      })
    },
  })
}
