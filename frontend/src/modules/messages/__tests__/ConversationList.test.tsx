import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConversationList } from '../components/ConversationList'
import type { ConversationSummaryDto } from '@/core/types/api.types'

// ConversationListItem reads the current partner id from the auth store via a selector.
vi.mock('@/shared/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { partnerId: string }) => unknown) => selector({ partnerId: 'me' }),
}))

const partnerConversation: ConversationSummaryDto = {
  id: 'partner-1',
  type: 'Partner',
  name: null,
  participants: [
    { partnerId: 'me', coupleId: 'c1', name: 'Alex', role: 'Husband', avatarUrl: null },
    { partnerId: 'you', coupleId: 'c1', name: 'Sam', role: 'Wife', avatarUrl: null },
  ],
  lastMessagePreview: 'See you tonight',
  lastMessageSenderPartnerId: 'you',
  lastActivityAt: new Date().toISOString(),
  isPinned: true,
  isOwner: false,
}

const groupConversation: ConversationSummaryDto = {
  ...partnerConversation,
  id: 'group-1',
  type: 'Group',
  name: 'Trip Crew',
  isPinned: false,
}

const noop = () => {}

describe('ConversationList', () => {
  it('shows a loading skeleton while loading', () => {
    const { container } = render(
      <ConversationList
        conversations={undefined}
        isLoading
        isError={false}
        activeId={null}
        onSelect={noop}
        onNewGroup={noop}
      />,
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows an empty state when there are no conversations', () => {
    render(
      <ConversationList
        conversations={[]}
        isLoading={false}
        isError={false}
        activeId={null}
        onSelect={noop}
        onNewGroup={noop}
      />,
    )
    expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument()
  })

  it('renders conversations and fires onSelect when one is clicked', () => {
    const onSelect = vi.fn()
    render(
      <ConversationList
        conversations={[partnerConversation, groupConversation]}
        isLoading={false}
        isError={false}
        activeId={null}
        onSelect={onSelect}
        onNewGroup={noop}
      />,
    )

    expect(screen.getByText('You & Sam')).toBeInTheDocument()
    expect(screen.getByText('Trip Crew')).toBeInTheDocument()

    fireEvent.click(screen.getByText('You & Sam'))
    expect(onSelect).toHaveBeenCalledWith('partner-1')
  })

  it('fires onNewGroup from the New button', () => {
    const onNewGroup = vi.fn()
    render(
      <ConversationList
        conversations={[]}
        isLoading={false}
        isError={false}
        activeId={null}
        onSelect={noop}
        onNewGroup={onNewGroup}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /new group chat/i }))
    expect(onNewGroup).toHaveBeenCalledTimes(1)
  })
})
