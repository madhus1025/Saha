import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Hash, Lock } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { authApi } from '@/core/api/auth.api'
import { toast } from '@/shared/hooks/use-toast'
import { extractApiError } from '@/core/utils/error.utils'

const schema = z
  .object({
    togetherIDOrUsername: z.string().min(1, 'Required'),
    code: z
      .string()
      .length(6, 'Code must be exactly 6 digits')
      .regex(/^\d{6}$/, 'Must contain only digits'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Need at least one uppercase letter')
      .regex(/[a-z]/, 'Need at least one lowercase letter')
      .regex(/[0-9]/, 'Need at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Need at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      authApi.resetPassword({
        togetherIDOrUsername: values.togetherIDOrUsername,
        code: values.code,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      }),
    onSuccess: () => {
      toast({
        title: 'Password updated!',
        description: 'Your shared password has been reset. Please sign in.',
        variant: 'success',
      })
      navigate('/login', { replace: true })
    },
    onError: (error) => {
      const apiError = extractApiError(error)
      toast({
        title: 'Reset failed',
        description: apiError.message,
        variant: 'error',
      })
    },
  })

  const onSubmit = (values: FormValues) => mutation.mutate(values)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-sandstone-900 dark:text-sandstone-100">
          New password
        </h1>
        <p className="text-copy-muted mt-1.5">
          Enter the code you received and set a new shared password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Together ID or Username"
          placeholder="YOUR-TOGETHER-ID or your_username"
          leftIcon={Hash}
          error={errors.togetherIDOrUsername?.message}
          required
          {...register('togetherIDOrUsername')}
        />

        <Input
          label="6-Digit Code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          error={errors.code?.message}
          hint="Check both partners' email inboxes"
          required
          {...register('code')}
        />

        <Input
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          leftIcon={Lock}
          error={errors.newPassword?.message}
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              // Icon-only control: without a name a screen reader announces just "button", and on
              // the reset screen this is the one affordance that lets a user verify what they typed
              // into a form they reached because they already could not get in (SAHA-D13).
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="text-copy-subtle hover:text-sandstone-700 dark:hover:text-sandstone-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          {...register('newPassword')}
        />

        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          leftIcon={Lock}
          error={errors.confirmPassword?.message}
          required
          {...register('confirmPassword')}
        />

        <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
          Reset password
        </Button>
      </form>

      <div className="text-center">
        <Link to="/forgot-password" className="text-sm text-copy-muted hover:text-sandstone-700">
          ← Resend code
        </Link>
      </div>
    </div>
  )
}
