import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, User, Mail, Phone, Calendar, Hash, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { registerSchema, type RegisterFormValues } from '../schemas/register.schema'
import { useRegister } from '../hooks/useRegister'
import { cn } from '@/core/utils/cn'

const STEPS = ['Together', 'Husband', 'Wife', 'Password'] as const
type Step = 0 | 1 | 2 | 3

export function RegisterPage() {
  const [step, setStep] = useState<Step>(0)
  const [showPassword, setShowPassword] = useState(false)
  const register_ = useRegister()

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  })

  const goNext = async () => {
    const fields: Record<Step, (keyof RegisterFormValues)[]> = {
      0: ['togetherID'],
      1: ['husbandUsername', 'husbandName', 'husbandDateOfBirth', 'husbandEmail', 'husbandPhoneNumber'],
      2: ['wifeUsername', 'wifeName', 'wifeDateOfBirth', 'wifeEmail', 'wifePhoneNumber'],
      3: ['password', 'confirmPassword'],
    }
    const valid = await trigger(fields[step])
    if (valid) setStep((prev) => Math.min(prev + 1, 3) as Step)
  }

  const onSubmit = (values: RegisterFormValues) => {
    register_.mutate(values)
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-medium text-sandstone-900 dark:text-sandstone-100">
          Create your home
        </h1>
        <p className="text-sandstone-500 dark:text-sandstone-400 mt-1.5">
          Set up your couple account in a few steps
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                  i <= step
                    ? 'bg-gold-500 text-white'
                    : 'bg-sandstone-100 text-sandstone-400 dark:bg-sandstone-800',
                )}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block transition-colors',
                  i <= step ? 'text-gold-600 dark:text-gold-400' : 'text-sandstone-400',
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px transition-all duration-300',
                  i < step ? 'bg-gold-400' : 'bg-sandstone-200 dark:bg-sandstone-700',
                )}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Step 0: Together ID */}
        {step === 0 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="rounded-2xl bg-gold-50 dark:bg-gold-900/20 border border-gold-100 dark:border-gold-800 p-4">
              <p className="text-sm text-gold-800 dark:text-gold-300 font-medium">Together ID</p>
              <p className="text-xs text-gold-600 dark:text-gold-400 mt-1">
                Your unique couple identity. Other couples can find you using this ID.
                <br />Example: <strong>MADHU-PRIYA</strong>
              </p>
            </div>
            <Input
              label="Together ID"
              placeholder="HUSBAND-WIFE"
              leftIcon={Hash}
              error={errors.togetherID?.message}
              hint="Use uppercase letters, numbers, and hyphens. E.g. JOHN-JANE"
              required
              {...register('togetherID', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase()
                },
              })}
            />
          </motion.div>
        )}

        {/* Step 1: Husband */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="rounded-2xl bg-copper-50 dark:bg-copper-900/20 border border-copper-100 dark:border-copper-800 p-3">
              <p className="text-sm font-medium text-copper-800 dark:text-copper-300">Husband's Details</p>
            </div>
            <Input label="Username" placeholder="madhu" leftIcon={User} error={errors.husbandUsername?.message} required {...register('husbandUsername')} />
            <Input label="Full Name" placeholder="Madhu Kumar" error={errors.husbandName?.message} required {...register('husbandName')} />
            <Input label="Date of Birth" type="date" leftIcon={Calendar} error={errors.husbandDateOfBirth?.message} required {...register('husbandDateOfBirth')} />
            <Input label="Email" type="email" placeholder="madhu@example.com" leftIcon={Mail} error={errors.husbandEmail?.message} required {...register('husbandEmail')} />
            <Input label="Phone Number" type="tel" placeholder="+91XXXXXXXXXX" leftIcon={Phone} error={errors.husbandPhoneNumber?.message} required {...register('husbandPhoneNumber')} />
          </motion.div>
        )}

        {/* Step 2: Wife */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="rounded-2xl bg-forest-50 dark:bg-forest-900/20 border border-forest-100 dark:border-forest-800 p-3">
              <p className="text-sm font-medium text-forest-800 dark:text-forest-300">Wife's Details</p>
            </div>
            <Input label="Username" placeholder="priya" leftIcon={User} error={errors.wifeUsername?.message} required {...register('wifeUsername')} />
            <Input label="Full Name" placeholder="Priya Kumar" error={errors.wifeName?.message} required {...register('wifeName')} />
            <Input label="Date of Birth" type="date" leftIcon={Calendar} error={errors.wifeDateOfBirth?.message} required {...register('wifeDateOfBirth')} />
            <Input label="Email" type="email" placeholder="priya@example.com" leftIcon={Mail} error={errors.wifeEmail?.message} required {...register('wifeEmail')} />
            <Input label="Phone Number" type="tel" placeholder="+91XXXXXXXXXX" leftIcon={Phone} error={errors.wifePhoneNumber?.message} required {...register('wifePhoneNumber')} />
          </motion.div>
        )}

        {/* Step 3: Password */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="rounded-2xl bg-sandstone-50 dark:bg-sandstone-900/50 border border-sandstone-100 dark:border-sandstone-800 p-3">
              <p className="text-sm font-medium text-sandstone-700 dark:text-sandstone-300">Shared Password</p>
              <p className="text-xs text-sandstone-500 mt-1">Both partners will use this same password to sign in.</p>
            </div>
            <Input
              label="Shared Password"
              type={showPassword ? 'text' : 'password'}
              leftIcon={Lock}
              error={errors.password?.message}
              required
              rightElement={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-sandstone-400 hover:text-sandstone-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...register('password')}
            />
            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              leftIcon={Lock}
              error={errors.confirmPassword?.message}
              required
              {...register('confirmPassword')}
            />
          </motion.div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setStep((prev) => Math.max(prev - 1, 0) as Step)}
            >
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button type="button" size="lg" className="flex-1" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="submit" size="lg" className="flex-1" loading={register_.isPending}>
              Create Account
            </Button>
          )}
        </div>
      </form>

      <div className="text-center">
        <p className="text-sm text-sandstone-500">
          Already have an account?{' '}
          <Link to="/login" className="text-gold-600 hover:text-gold-700 dark:text-gold-400 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
