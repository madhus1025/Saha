import { describe, it, expect } from 'vitest'
import { conversationTitle, participantSummary, relativeTime } from '../utils'
import type { ConversationSummaryDto } from '@/core/types/api.types'

const base: ConversationSummaryDto = {
  id: 'c1',
  type: 'Partner',
  name: null,
  participants: [
    { partnerId: 'me', coupleId: 'couple1', name: 'Alex', role: 'Husband', avatarUrl: null },
    { partnerId: 'you', coupleId: 'couple1', name: 'Sam', role: 'Wife', avatarUrl: null },
  ],
  lastMessagePreview: null,
  lastMessageSenderPartnerId: null,
  lastActivityAt: new Date().toISOString(),
  isPinned: true,
  isOwner: false,
}

describe('messaging utils', () => {
  it('derives partner conversation title from the other partner', () => {
    expect(conversationTitle(base, 'me')).toBe('You & Sam')
  })

  it('uses the group name for group conversations', () => {
    const group: ConversationSummaryDto = { ...base, type: 'Group', name: 'Trip Crew' }
    expect(conversationTitle(group, 'me')).toBe('Trip Crew')
  })

  it('summarizes participants by name', () => {
    expect(participantSummary(base)).toBe('Alex, Sam')
  })

  it('formats recent timestamps as "now"', () => {
    expect(relativeTime(new Date().toISOString())).toBe('now')
  })

  it('formats minute-old timestamps', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(relativeTime(fiveMinAgo)).toBe('5m')
  })
})
