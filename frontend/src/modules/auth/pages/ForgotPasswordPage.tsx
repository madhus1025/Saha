import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Hash } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { authApi } from '@/core/api/auth.api'
import { toast } from '@/shared/hooks/use-toast'
import { motion } from 'framer-motion'

const schema = z.object({
  togetherIDOrUsername: z
    .string()
    .min(1, 'Please enter your Together ID or username')
    .max(50),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.forgotPassword(values),
    onSuccess: () => {
      toast({
        title: 'Code sent!',
        description: 'A reset code has been sent to both partners\' email addresses.',
        variant: 'success',
      })
    },
    onError: () => {
      // Always show success to prevent enumeration attacks
      toast({
        title: 'Code sent!',
        description: 'If the account exists, a reset code has been sent to both email addresses.',
        variant: 'success',
      })
    },
  })

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-sandstone-900 dark:text-sandstone-100">
          Reset password
        </h1>
        <p className="text-sandstone-500 dark:text-sandstone-400 mt-1.5">
          Enter your Together ID or username and we'll send a code to both email addresses.
        </p>
      </div>

      {mutation.isSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-forest-50 dark:bg-forest-900/20 border border-forest-200 dark:border-forest-800 p-6 text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-full bg-forest-100 dark:bg-forest-800 flex items-center justify-center mx-auto">
            <span className="text-xl">✉️</span>
          </div>
          <div>
            <p className="font-medium text-forest-800 dark:text-forest-300">Check your emails</p>
            <p className="text-sm text-forest-600 dark:text-forest-400 mt-1">
              A 6-digit code has been sent to both partners' email addresses.
            </p>
          </div>
          <Link
            to="/reset-password"
            className="btn-primary inline-block mt-2"
          >
            Enter reset code
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Input
            label="Together ID or Username"
            placeholder="MADHU-PRIYA or madhu"
            leftIcon={Hash}
            error={errors.togetherIDOrUsername?.message}
            hint="Enter your couple's Together ID (e.g. MADHU-PRIYA) or your personal username"
            required
            {...register('togetherIDOrUsername')}
          />

          <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
            Send reset code
          </Button>
        </form>
      )}

      <div className="text-center">
        <Link
          to="/login"
          className="text-sm text-sandstone-500 hover:text-sandstone-700 dark:text-sandstone-400 transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  )
}
