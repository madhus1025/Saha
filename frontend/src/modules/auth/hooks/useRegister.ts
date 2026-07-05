import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { authApi } from '@/core/api/auth.api'
import { extractApiError } from '@/core/utils/error.utils'
import { toast } from '@/shared/hooks/use-toast'
import { format } from 'date-fns'
import type { RegisterFormValues } from '../schemas/register.schema'

export function useRegister() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (values: RegisterFormValues) =>
      authApi.register({
        ...values,
        husbandDateOfBirth: format(values.husbandDateOfBirth, 'yyyy-MM-dd'),
        wifeDateOfBirth: format(values.wifeDateOfBirth, 'yyyy-MM-dd'),
      }),
    onSuccess: () => {
      toast({
        title: 'Welcome to Saha!',
        description: 'Your couple account has been created. Please sign in.',
        variant: 'success',
      })
      navigate('/login', { replace: true })
    },
    onError: (error) => {
      const apiError = extractApiError(error)
      toast({
        title: 'Registration failed',
        description: apiError.message,
        variant: 'error',
      })
    },
  })
}
