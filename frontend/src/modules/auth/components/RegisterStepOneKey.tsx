import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { telemetry } from '@/core/telemetry/telemetry.service'
import { registerStepTwoSchema, type RegisterStepTwoValues } from '../schemas/register.schema'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'

interface RegisterStepOneKeyProps {
  defaultValues: RegisterStepTwoValues | null
  onContinue: (values: RegisterStepTwoValues) => void
  onBack: () => void
}

export function RegisterStepOneKey({ defaultValues, onContinue, onBack }: RegisterStepOneKeyProps) {
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    telemetry.track('auth.register_step2_viewed')
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterStepTwoValues>({
    resolver: zodResolver(registerStepTwoSchema),
    defaultValues: defaultValues ?? { password: '', confirmPassword: '' },
  })

  const password = watch('password') ?? ''

  const onSubmit = (values: RegisterStepTwoValues) => {
    telemetry.track('auth.register_step2_completed')
    onContinue(values)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h1 className="font-display text-3xl font-medium text-sandstone-900 dark:text-cream-200">
          One key for your home
        </h1>
        <p className="mt-1.5 text-sandstone-600 dark:text-sandstone-400">
          You’ll share this password. Pick something you’d both remember — and only you two would know.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Input
            label="Password"
            tone="gentle"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="text-sandstone-500 hover:text-sandstone-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register('password')}
          />

          {/* A weak-but-valid passphrase is warned about, never blocked. */}
          <PasswordStrengthMeter password={password} />
        </div>

        <Input
          label="Once more"
          tone="gentle"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
      </div>

      <div className="space-y-3">
        <Button type="submit" className="w-full" size="lg">
          Continue
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          Back
        </Button>
      </div>
    </form>
  )
}
