import { PASSWORD_MIN_LENGTH, passwordByteLength } from '../schemas/register.schema'

export interface PassphraseStrength {
  /** 0–4. Below the length floor this is 0; it never gates the Continue button above it. */
  score: number
  label: string
}

/**
 * Qualitative and warm, never numeric. Length carries most of the weight because a long phrase two
 * people both remember beats a mandated symbol.
 *
 * Below {@link PASSWORD_MIN_LENGTH} the password is *invalid*, not merely weak — that floor is
 * enforced by the schema, and is the only thing that blocks Continue.
 */
export function assessPassphrase(password: string): PassphraseStrength {
  if (password.length === 0) return { score: 0, label: '' }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { score: 0, label: 'A little longer — at least 12 characters' }
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
