import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { loginSchema, type LoginFormValues } from '../schemas/login.schema'
import { useLogin } from '../hooks/useLogin'
import { telemetry } from '@/core/telemetry/telemetry.service'
import { LOGIN_PAGE_VIEWED } from '@/core/telemetry/events'

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const login = useLogin()

  // Track page view once on mount \u2014 measures top-of-funnel
  useEffect(() => {
    telemetry.track(LOGIN_PAGE_VIEWED)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values)
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-medium text-sandstone-900 dark:text-cream-200">
          Welcome home
        </h1>
        <p className="mt-1.5 text-sandstone-600 dark:text-sandstone-400">
          Either of your usernames opens the door.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Username"
          tone="gentle"
          type="text"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />

        <Input
          label="Your shared password"
          tone="gentle"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
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

        <Button type="submit" className="w-full" size="lg" loading={login.isPending}>
          Sign in
        </Button>

        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-sandstone-700 dark:text-sandstone-300 hover:underline"
          >
            Forgot our password?
          </Link>
        </div>
      </form>

      <div className="border-t border-sandstone-200 dark:border-sandstone-800 pt-5 text-center text-sm">
        <span className="text-sandstone-500 dark:text-sandstone-400">New here? </span>
        <Link to="/register" className="font-semibold text-forest-700 dark:text-sage-300 hover:underline">
          Create our home
        </Link>
        <span className="text-sandstone-400"> \u00b7 </span>
        <Link to="/invite/accept" className="font-semibold text-forest-700 dark:text-sage-300 hover:underline">
          I have an invitation
        </Link>
      </div>
    </div>
  )
}
