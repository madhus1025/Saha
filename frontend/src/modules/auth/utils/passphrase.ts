import { PASSWORD_MIN_LENGTH, passwordByteLength } from '../schemas/register.schema'

export interface PassphraseStrength {
  /** 0–4. Below the length floor this is 0; it never gates the Continue button above it. */
  score: number
  label: string
}

/**
 * Qualitative and warm, never numeric. Length carries most of the weight: a long phrase two people
 * both remember is easier to live with than a short one bristling with symbols.
 *
 * This is advisory only. What actually blocks Continue is the schema — the length floor *and* the
 * character-class rules, which registration shares with password reset (see `PasswordRules.cs`).
 */
export function assessPassphrase(password: string): PassphraseStrength {
  if (password.length === 0) return { score: 0, label: '' }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { score: 0, label: `A little longer — at least ${PASSWORD_MIN_LENGTH} characters` }
  }

  if (passwordByteLength(password) > 72) {
    return { score: 0, label: 'That’s longer than we can keep safe' }
  }

  const words = password.trim().split(/\s+/).length
  const distinct = new Set(password).size

  // Calibrated so the deck's own example, "correct horse battery staple" (28 chars, 4 words),
  // lands on 3 — three filled segments and "Good — long and easy to say out loud".
  let score = 1
  if (password.length >= 16) score += 1
  if (words >= 3 || distinct >= 12) score += 1
  if (password.length >= 32 && words >= 5) score += 1

  const labels = [
    '',
    'It’ll do — a few more words would help',
    'Getting there — easy to remember?',
    'Good — long and easy to say out loud',
    'Lovely — long, and only you two would know it',
  ]

  return { score, label: labels[score] ?? '' }
}
