import { useEffect } from 'react'
import { Link } from 'react-router'
import { cn } from '@/core/utils/cn'
import { useRegisterWizard } from '../hooks/useRegisterWizard'
import { useRegister } from '../hooks/useRegister'
import { RegisterStepYourHalf } from '../components/RegisterStepYourHalf'
import { RegisterStepOneKey } from '../components/RegisterStepOneKey'
import { RegisterStepYourDoor } from '../components/RegisterStepYourDoor'
import type { RegisterStepThreeValues } from '../schemas/register.schema'

const STEP_LABELS = ['Your half', 'One key', 'Your door'] as const

export function RegisterPage() {
  const { step, stepOne, stepTwo, setStepOne, setStepTwo, goBack, reset } = useRegisterWizard()
  const registerCouple = useRegister()

  // Leaving the wizard clears the plaintext password from memory (D-4).
  useEffect(() => reset, [reset])

  const handleOpenHome = ({ togetherID }: RegisterStepThreeValues) => {
    if (!stepOne || !stepTwo) return

    registerCouple.mutate({
      togetherID,
      username: stepOne.username,
      name: stepOne.name,
      dateOfBirth: stepOne.dateOfBirth,
      email: stepOne.email,
      phoneNumber: stepOne.phoneNumber,
      role: stepOne.role,
      password: stepTwo.password,
      confirmPassword: stepTwo.confirmPassword,
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-copy-muted">
          Step {step} of 3 · <span className="font-medium">{STEP_LABELS[step - 1]}</span>
        </p>

        <div className="flex items-center gap-1.5" aria-hidden>
          {[1, 2, 3].map((dot) => (
            <span
              key={dot}
              className={cn(
                'h-1.5 rounded-full transition-all',
                dot === step ? 'w-5 bg-forest-600' : 'w-1.5 bg-sandstone-300 dark:bg-sandstone-700',
              )}
            />
          ))}
        </div>
      </div>

      {step === 1 && <RegisterStepYourHalf defaultValues={stepOne} onContinue={setStepOne} />}

      {step === 2 && (
        <RegisterStepOneKey defaultValues={stepTwo} onContinue={setStepTwo} onBack={goBack} />
      )}

      {step === 3 && (
        <RegisterStepYourDoor
          onOpenHome={handleOpenHome}
          onBack={goBack}
          isSubmitting={registerCouple.isPending}
        />
      )}

      <div className="border-t border-sandstone-200 dark:border-sandstone-800 pt-5 text-center text-sm">
        <span className="text-copy-muted">Already home? </span>
        <Link
          to="/login"
          className="font-semibold text-forest-700 dark:text-sage-300 hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
