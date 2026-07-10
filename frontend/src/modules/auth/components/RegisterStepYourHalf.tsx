import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { telemetry } from '@/core/telemetry/telemetry.service'
import { registerStepOneSchema, type RegisterStepOneValues } from '../schemas/register.schema'
import { useAvailability } from '../hooks/useAvailability'
import { RoleToggle } from './RoleToggle'

interface RegisterStepYourHalfProps {
  defaultValues: RegisterStepOneValues | null
  onContinue: (values: RegisterStepOneValues) => void
}

export function RegisterStepYourHalf({ defaultValues, onContinue }: RegisterStepYourHalfProps) {
  useEffect(() => {
    telemetry.track('auth.register_step1_viewed')
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<RegisterStepOneValues>({
    resolver: zodResolver(registerStepOneSchema),
    defaultValues: defaultValues ?? {
      name: '',
      username: '',
      dateOfBirth: '',
      email: '',
      phoneNumber: '',
    },
  })

  const username = watch('username') ?? ''
  const role = watch('role')

  const usernameLooksValid = /^[a-z][a-z0-9_.]{2,29}$/.test(username)
  const { available: usernameAvailable, isChecking } = useAvailability({
    field: 'username',
    value: username,
    enabled: usernameLooksValid,
  })

  const onSubmit = (values: RegisterStepOneValues) => {
    // A taken username is surfaced here rather than after two more steps of work.
    if (usernameAvailable === false) {
      setError('username', { message: 'That one’s taken. Try another?' })
      return
    }

    telemetry.track('auth.register_step1_completed')
    onContinue(values)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h1 className="font-display text-3xl font-medium text-sandstone-900 dark:text-cream-200">
          First, you
        </h1>
        <p className="mt-1.5 text-sandstone-600 dark:text-sandstone-400">
          Your person fills in their own half when they arrive — you never type for them.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Your name"
          tone="gentle"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Username"
          tone="gentle"
          autoComplete="username"
          hint={
            isChecking
              ? 'Checking…'
              : usernameAvailable === true
                ? 'Available — it’s all yours'
                : 'lowercase, yours alone'
          }
          error={errors.username?.message}
          {...register('username')}
        />

        <Input
          label="Date of birth"
          tone="gentle"
          type="date"
          hint="16+"
          error={errors.dateOfBirth?.message}
          {...register('dateOfBirth')}
        />

        <RoleToggle
          value={role}
          onChange={(next) => setValue('role', next, { shouldValidate: true })}
          error={errors.role?.message}
        />

        <Input
          label="Email"
          tone="gentle"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Phone"
          tone="gentle"
          type="tel"
          autoComplete="tel"
          placeholder="+31 6 1204 8890"
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />
      </div>

      <Button type="submit" className="w-full" size="lg">
        Continue
      </Button>
    </form>
  )
}
