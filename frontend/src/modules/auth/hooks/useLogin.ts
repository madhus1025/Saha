import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { authApi } from '@/core/api/auth.api'
import { useAuthStore } from '@/shared/stores/auth.store'
import { extractApiError } from '@/core/utils/error.utils'
import { toast } from '@/shared/hooks/use-toast'
import type { LoginFormValues } from '../schemas/login.schema'

export function useLogin() {
  const navigate = useNavigate()
  const setAuthData = useAuthStore((s) => s.setAuthData)

  return useMutation({
    mutationFn: (values: LoginFormValues) => authApi.login(values),
    onSuccess: (data) => {
      setAuthData(data)
      navigate('/dashboard', { replace: true })
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
