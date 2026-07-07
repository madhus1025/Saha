import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character')

const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username cannot exceed 30 characters')
  .regex(/^[a-z][a-z0-9_.]{2,29}$/, 'Must start with a letter; only lowercase letters, numbers, dots, underscores')

const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Enter a valid international phone number (e.g. +91xxxxxxxxxx)')

const dobSchema = z.coerce
  .date()
  .max(new Date(Date.now() - 16 * 365.25 * 24 * 60 * 60 * 1000), 'Must be at least 16 years old')
  .min(new Date('1900-01-01'), 'Date of birth is not valid')

export const registerSchema = z
  .object({
    togetherID: z
      .string()
      .min(3, 'Together ID must be at least 3 characters')
      .max(50, 'Together ID cannot exceed 50 characters')
      .regex(
        /^[A-Z0-9][A-Z0-9-]{1,48}[A-Z0-9]$/,
        'Must contain only uppercase letters, numbers, and hyphens',
      ),
    husbandUsername: usernameSchema,
    husbandName: z.string().min(1, 'Name is required').max(100),
    husbandDateOfBirth: dobSchema,
    husbandEmail: z.string().email('Enter a valid email'),
    husbandPhoneNumber: phoneSchema,
    wifeUsername: usernameSchema,
    wifeName: z.string().min(1, 'Name is required').max(100),
    wifeDateOfBirth: dobSchema,
    wifeEmail: z.string().email('Enter a valid email'),
    wifePhoneNumber: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.husbandUsername !== data.wifeUsername, {
    message: 'Husband and wife must have different usernames',
    path: ['wifeUsername'],
  })
  .refine((data) => data.husbandEmail !== data.wifeEmail, {
    message: 'Husband and wife must have different email addresses',
    path: ['wifeEmail'],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
