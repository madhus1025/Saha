import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { telemetry } from '@/core/telemetry/telemetry.service'
import { registerStepThreeSchema, type RegisterStepThreeValues } from '../schemas/register.schema'
import { useAvailability } from '../hooks/useAvailability'

interface RegisterStepYourDoorProps {
  onOpenHome: (values: RegisterStepThreeValues) => void
  onBack: () => void
  isSubmitting: boolean
}

const TOGETHER_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,48}[A-Z0-9]$/

export function RegisterStepYourDoor({ onOpenHome, onBack, isSubmitting }: RegisterStepYourDoorProps) {
  useEffect(() => {
    telemetry.track('auth.register_step3_viewed')
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterStepThreeValues>({
    resolver: zodResolver(registerStepThreeSchema),
    defaultValues: { togetherID: '' },
  })

  const togetherID = watch('togetherID') ?? ''
  const looksValid = TOGETHER_ID_PATTERN.test(togetherID)

  const { available, isChecking, checkFailed } = useAvailability({
    field: 'togetherId',
    value: togetherID,
    enabled: looksValid,
  })

  useEffect(() => {
    if (available === false) telemetry.track('auth.togetherid_unavailable')
  }, [available])

  const verdict = () => {
    if (!togetherID || !looksValid || checkFailed) return null
    if (isChecking) return <span className="text-sandstone-500">Checking…</span>
    if (available === true) {
      return (
        <span className="flex items-center gap-1.5 text-forest-600 dark:text-sage-300">
          <Check className="h-4 w-4" aria-hidden />
          Available — it’s all yours
        </span>
      )
    }
    if (available === false) {
      return (
        <span className="text-sandstone-700 dark:text-sandstone-300">
          That door already belongs to someone. Try another?
        </span>
      )
    }
    return null
  }

  return (
    <form onSubmit={handleSubmit(onOpenHome)} className="space-y-6" noValidate>
      <div className="text-center">
        <h1 className="font-display text-3xl font-medium text-sandstone-900 dark:text-cream-200">
          The name on your door
        </h1>
        <p className="mt-1.5 text-sandstone-600 dark:text-sandstone-400">
          Your TogetherID is public — it’s how other couples find you. Uppercase, yours forever.
        </p>
      </div>

      <div className="space-y-1.5">
        <Input
          label="TogetherID"
          tone="gentle"
          className="font-mono tracking-wider"
          autoComplete="off"
          spellCheck={false}
          error={errors.togetherID?.message}
          {...register('togetherID')}
          onChange={(event) =>
            setValue('togetherID', event.target.value.toUpperCase(), { shouldValidate: false })
          }
        />

        <p className="text-xs" aria-live="polite" data-testid="togetherid-availability">
          {verdict()}
        </p>
      </div>

      <div className="space-y-3">
        {/*
          Deliberately not disabled when the availability check fails or is still in flight:
          uniqueness is decided authoritatively on submit, and a failed convenience check must
          never trap the user (spec edge case 4).
        */}
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Open our home
        </Button>

        <p className="text-center text-xs text-sandstone-500 dark:text-sandstone-400">
          {/*
            The deck's copy reads "Next: invite Arun in." — but no in-scope screen collects the
            partner's name, so it cannot be rendered here yet. The invite screen asks for it.
          */}
          Next: invite your person in. The home opens when you’re both here.
        </p>

        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          Back
        </Button>
      </div>
    </form>
  )
}
