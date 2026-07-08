import { z } from 'zod'

// Client mirrors server limits (defense in depth); the server remains authoritative.

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message is too long'),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>

export const renameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80, 'Name cannot exceed 80 characters'),
})
export type RenameInput = z.infer<typeof renameSchema>

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80, 'Name cannot exceed 80 characters'),
  targetCoupleIds: z.array(z.string()).min(1, 'Select at least one couple'),
})
export type CreateGroupInput = z.infer<typeof createGroupSchema>

/** Curated reaction allowlist (tokens) mapped to the emoji rendered in the UI. Mirrors ReactionEmoji.Allowed. */
export const REACTIONS: ReadonlyArray<{ token: string; emoji: string; label: string }> = [
  { token: 'heart', emoji: '❤️', label: 'Love' },
  { token: 'laugh', emoji: '😂', label: 'Haha' },
  { token: 'wow', emoji: '😮', label: 'Wow' },
  { token: 'sad', emoji: '😢', label: 'Sad' },
  { token: 'thumbsup', emoji: '👍', label: 'Like' },
  { token: 'fire', emoji: '🔥', label: 'Fire' },
]

export const reactionEmoji = (token: string): string =>
  REACTIONS.find((r) => r.token === token)?.emoji ?? token

// Media constraints (advisory; server enforces authoritatively).
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
