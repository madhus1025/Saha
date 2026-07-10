import { describe, expect, it } from 'vitest'
import {
  passwordByteLength,
  registerStepOneSchema,
  registerStepThreeSchema,
  registerStepTwoSchema,
} from '../register.schema'

const validStepOne = {
  name: 'Maya Krishnan',
  username: 'maya.k',
  dateOfBirth: '1996-06-14',
  role: 'Wife' as const,
  email: 'maya@post.com',
  phoneNumber: '+31612048890',
}

describe('registerStepOneSchema — your half', () => {
  it('accepts the registrant’s own details', () => {
    expect(registerStepOneSchema.safeParse(validStepOne).success).toBe(true)
  })

  it('has no field describing the other partner', () => {
    const keys = Object.keys(registerStepOneSchema.shape)
    expect(keys).toEqual(['name', 'username', 'dateOfBirth', 'role', 'email', 'phoneNumber'])
  })

  it.each(['MAYA.K', 'ab', '1maya', ''])('rejects invalid username %s', (username) => {
    expect(registerStepOneSchema.safeParse({ ...validStepOne, username }).success).toBe(false)
  })

  it('accepts a lowercase username', () => {
    expect(registerStepOneSchema.safeParse({ ...validStepOne, username: 'maya.k' }).success).toBe(true)
  })

  it('requires a role', () => {
    const result = registerStepOneSchema.safeParse({ ...validStepOne, role: undefined })
    expect(result.success).toBe(false)
  })

  it.each(['Wife', 'Husband'] as const)('accepts role %s', (role) => {
    expect(registerStepOneSchema.safeParse({ ...validStepOne, role }).success).toBe(true)
  })

  /** Mirrors what `<input type="date">` submits: a plain YYYY-MM-DD, no timezone. */
  const utcDateYearsAgo = (years: number, plusDays = 0) => {
    const now = new Date()
    return new Date(
      Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate() + plusDays),
    )
      .toISOString()
      .slice(0, 10)
  }

  it('rejects someone a day short of sixteen', () => {
    const result = registerStepOneSchema.safeParse({
      ...validStepOne,
      dateOfBirth: utcDateYearsAgo(16, 1),
    })
    expect(result.success).toBe(false)
  })

  it('accepts someone who is exactly sixteen today', () => {
    // Calendar arithmetic, not 16 * 365.25 days, and UTC on both sides: the alternatives disagree
    // with the server across leap years and across midnight, rejecting a valid birthday.
    const result = registerStepOneSchema.safeParse({
      ...validStepOne,
      dateOfBirth: utcDateYearsAgo(16),
    })
    expect(result.success).toBe(true)
  })

  it('rejects an implausible age', () => {
    expect(
      registerStepOneSchema.safeParse({ ...validStepOne, dateOfBirth: '1800-01-01' }).success,
    ).toBe(false)
  })

  it.each(['', 'not-an-email'])('rejects invalid email %s', (email) => {
    expect(registerStepOneSchema.safeParse({ ...validStepOne, email }).success).toBe(false)
  })

  it.each(['', '12345', '+0123456789'])('rejects invalid phone %s', (phoneNumber) => {
    expect(registerStepOneSchema.safeParse({ ...validStepOne, phoneNumber }).success).toBe(false)
  })
})

describe('registerStepTwoSchema — one key', () => {
  const ok = (password: string) =>
    registerStepTwoSchema.safeParse({ password, confirmPassword: password }).success

  it('accepts a passphrase with no digit, symbol, or capital', () => {
    expect(ok('correct horse battery staple')).toBe(true)
  })

  it('rejects eleven characters even when they contain every character class', () => {
    expect(ok('Sh0rt!Sh0rt')).toBe(false)
  })

  it('accepts exactly twelve characters', () => {
    expect(ok('a'.repeat(12))).toBe(true)
  })

  it('accepts exactly seventy-two bytes', () => {
    expect(ok('a'.repeat(72))).toBe(true)
  })

  it('rejects seventy-three bytes', () => {
    // BCrypt silently ignores everything past byte 72.
    expect(ok('a'.repeat(73))).toBe(false)
  })

  it('counts bytes, not characters, for multi-byte passphrases', () => {
    const emoji = '😀'.repeat(30) // 30 characters, 120 bytes
    expect(emoji.length).toBeLessThan(72)
    expect(passwordByteLength(emoji)).toBeGreaterThan(72)
    expect(ok(emoji)).toBe(false)
  })

  it('requires the confirmation to match', () => {
    const result = registerStepTwoSchema.safeParse({
      password: 'our quiet home by the sea',
      confirmPassword: 'something else entirely',
    })
    expect(result.success).toBe(false)
  })
})

describe('registerStepThreeSchema — your door', () => {
  const ok = (togetherID: string) => registerStepThreeSchema.safeParse({ togetherID }).success

  it('accepts a valid TogetherID', () => {
    expect(ok('MAYA-ARUN')).toBe(true)
  })

  it('accepts exactly four characters', () => {
    expect(ok('AB-C')).toBe(true)
  })

  it('rejects three characters, which the domain would reject', () => {
    // The old client regex allowed {1,48} in the middle (min 3) while the TogetherID value
    // object requires {2,48} (min 4). "A-B" passed the client and 400'd at the server.
    expect(ok('A-B')).toBe(false)
  })

  it.each(['maya-arun', 'MAYA_ARUN', '-MAYA', 'MAYA-', ''])('rejects %s', (value) => {
    expect(ok(value)).toBe(false)
  })
})
