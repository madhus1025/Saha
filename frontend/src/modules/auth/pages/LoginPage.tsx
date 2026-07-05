import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, User, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { loginSchema, type LoginFormValues } from '../schemas/login.schema'
import { useLogin } from '../hooks/useLogin'

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const login = useLogin()

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
      <div>
        <h1 className="text-3xl font-medium text-sandstone-900 dark:text-sandstone-100">
          Welcome back
        </h1>
        <p className="text-sandstone-500 dark:text-sandstone-400 mt-1.5">
          Sign in to your shared account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Username"
          type="text"
          autoComplete="username"
          placeholder="Enter your username"
          leftIcon={User}
          error={errors.username?.message}
          required
          {...register('username')}
        />

        <Input
          label="Shared Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your shared password"
          leftIcon={Lock}
          error={errors.password?.message}
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-sandstone-400 hover:text-sandstone-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-gold-600 hover:text-gold-700 dark:text-gold-400 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={login.isPending}
        >
          Sign in
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-sandstone-500 dark:text-sandstone-400">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-gold-600 hover:text-gold-700 dark:text-gold-400 font-medium transition-colors"
          >
            Create your couple account
          </Link>
        </p>
      </div>

      {/* Visual indicator for dual identity */}
      <div className="rounded-2xl bg-sandstone-50 dark:bg-sandstone-900/50 border border-sandstone-100 dark:border-sandstone-800 p-4">
        <p className="text-xs text-sandstone-500 dark:text-sandstone-400 text-center leading-relaxed">
          Your username identifies <strong className="text-sandstone-700 dark:text-sandstone-300">who</strong> you are.
          <br />
          The shared password keeps your home <strong className="text-sandstone-700 dark:text-sandstone-300">private</strong>.
        </p>
      </div>
    </div>
  )
}
