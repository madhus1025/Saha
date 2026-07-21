import { create } from 'zustand'
import type {
  RegisterStepOneValues,
  RegisterStepTwoValues,
} from '../schemas/register.schema'

interface RegisterWizardState {
  step: 1 | 2 | 3
  stepOne: RegisterStepOneValues | null
  stepTwo: RegisterStepTwoValues | null

  setStepOne: (values: RegisterStepOneValues) => void
  setStepTwo: (values: RegisterStepTwoValues) => void
  goBack: () => void
  /** Return to step 1 with its values intact — used when the server reports a username collision. */
  returnToStepOne: () => void
  reset: () => void
}

/**
 * Deliberately **not** persisted.
 *
 * The account is created at step 3, so the plaintext password from step 2 has to survive two step
 * transitions. Keeping it in memory means a refresh loses the wizard, which is the price of never
 * writing a plaintext password to disk where any XSS payload could read it.
 */
export const useRegisterWizard = create<RegisterWizardState>()((set) => ({
  step: 1,
  stepOne: null,
  stepTwo: null,

  setStepOne: (stepOne) => set({ stepOne, step: 2 }),
  setStepTwo: (stepTwo) => set({ stepTwo, step: 3 }),

  goBack: () => set((state) => ({ step: (state.step === 1 ? 1 : state.step - 1) as 1 | 2 | 3 })),

  returnToStepOne: () => set({ step: 1 }),

  reset: () => set({ step: 1, stepOne: null, stepTwo: null }),
}))
