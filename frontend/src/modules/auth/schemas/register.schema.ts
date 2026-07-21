import { z } from 'zod'

/**
 * Mirrors the server's single password policy (`PasswordRules.cs`): at least 8 characters, one of
 * each character class, and at most 72 **bytes**.
 *
 * The ceiling is a byte count, not a character count, because BCrypt truncates its input at 72
 * bytes: a 30-emoji password is 30 characters but 120 bytes, and everything past byte 72 would be
 * silently ignored — so two passwords sharing a 72-byte prefix would both verify.
 *
 * Registration and password reset must agree. When they disagreed, a password legal at sign-up was
 * refused at reset (SAHA-D01).
 */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_BYTES = 72

export const passwordByteLength = (value: string) => new TextEncoder().encode(value).length

/**
 * Calendar arithmetic on the UTC date, compared as `YYYY-MM-DD` strings.
 *
 * Two traps this avoids: `16 * 365.25` days disagrees with the server's `AddYears(-16)` across leap
 * years, and `new Date('2010-07-10')` is UTC midnight while `setHours(0,0,0,0)` is *local* midnight
 * — so a user exactly sixteen today is rejected by the client and accepted by the server.
 */
const utcDateYearsAgo = (years: number) => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

const asDateOnly = (value: string) => value.slice(0, 10)

const usernameSchema = z
  .string()
  .min(3, 'A little longer — at least 3 characters.')
  .max(30, 'Usernames stop at 30 characters.')
  .regex(
    /^[a-z][a-z0-9_.]{2,29}$/,
    'Start with a letter; lowercase letters, numbers, dots and underscores only.',
  )

const dateOfBirthSchema = z
  .string()
  .min(1, 'Date of birth is required.')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'That date doesn’t look right.')
  .refine((value) => asDateOnly(value) <= utcDateYearsAgo(16), 'You need to be at least 16.')
  .refine(
    (value) => asDateOnly(value) >= utcDateYearsAgo(120),
    'That date of birth doesn’t look right.',
  )

/** Step 1 · Your half — only ever the registrant's own details. */
export const registerStepOneSchema = z.object({
  name: z.string().min(1, 'Your name is required.').max(100, 'Names stop at 100 characters.'),
  username: usernameSchema,
  dateOfBirth: dateOfBirthSchema,
  role: z.enum(['Wife', 'Husband'], { message: 'Choose one.' }),
  email: z.string().min(1, 'Email is required.').email('That email doesn’t look right.'),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required.')
    .regex(/^\+?[1-9]\d{6,14}$/, 'Enter a valid international number, like +31 6 1204 8890.'),
})

/** Step 2 · One key — the same policy the reset form and the server enforce. */
export const registerStepTwoSchema = z
  .object({
    // `.refine()` widens the type to ZodEffects, which has no `.regex()` — so the character-class
    // rules come first and the byte-length check closes the chain.
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `A little longer — at least ${PASSWORD_MIN_LENGTH} characters.`)
      .regex(/[A-Z]/, 'Add at least one uppercase letter.')
      .regex(/[a-z]/, 'Add at least one lowercase letter.')
      .regex(/[0-9]/, 'Add at least one number.')
      .regex(/[^a-zA-Z0-9]/, 'Add at least one special character.')
      .refine(
        (value) => passwordByteLength(value) <= PASSWORD_MAX_BYTES,
        'That’s longer than we can keep safe. Try something a little shorter.',
      ),
    confirmPassword: z.string().min(1, 'Once more, to be sure.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Those don’t match yet.',
    path: ['confirmPassword'],
  })

/** Step 3 · Your door — uppercase, yours forever. Minimum four characters, as the domain requires. */
export const registerStepThreeSchema = z.object({
  togetherID: z
    .string()
    .min(4, 'A little longer — at least 4 characters.')
    .max(50, 'TogetherIDs stop at 50 characters.')
    .regex(
      /^[A-Z0-9][A-Z0-9-]{2,48}[A-Z0-9]$/,
      'Uppercase letters, numbers and hyphens only, starting and ending with a letter or number.',
    ),
})

export type RegisterStepOneValues = z.infer<typeof registerStepOneSchema>
export type RegisterStepTwoValues = z.infer<typeof registerStepTwoSchema>
export type RegisterStepThreeValues = z.infer<typeof registerStepThreeSchema>

export type RegisterWizardValues = RegisterStepOneValues &
  RegisterStepTwoValues &
  RegisterStepThreeValues
