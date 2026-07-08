import type { ConversationSummaryDto, ConversationDetailDto } from '@/core/types/api.types'

/** Short relative time for the conversation list / message meta. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Display name for a conversation: group name, or the other partner(s) for a partner chat. */
export function conversationTitle(
  conversation: ConversationSummaryDto | ConversationDetailDto,
  currentPartnerId: string | null,
): string {
  if (conversation.type === 'Group') return conversation.name ?? 'Group chat'
  const other = conversation.participants.find((p) => p.partnerId !== currentPartnerId)
  const names = conversation.participants.map((p) => p.name)
  return other ? `You & ${other.name}` : names.join(' & ')
}

export function participantSummary(
  conversation: ConversationSummaryDto | ConversationDetailDto,
): string {
  return conversation.participants.map((p) => p.name).join(', ')
}
