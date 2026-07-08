import { MessageCircle, Pin, Plus } from 'lucide-react'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/core/utils/cn'
import { useAuthStore } from '@/shared/stores/auth.store'
import type { ConversationSummaryDto } from '@/core/types/api.types'
import { conversationTitle, relativeTime } from '../utils'

interface ConversationListProps {
  conversations: ConversationSummaryDto[] | undefined
  isLoading: boolean
  isError: boolean
  activeId: string | null
  onSelect: (id: string) => void
  onNewGroup: () => void
}

export function ConversationList({
  conversations,
  isLoading,
  isError,
  activeId,
  onSelect,
  onNewGroup,
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-sandstone-100 dark:border-sandstone-800">
        <h1 className="text-lg font-semibold text-sandstone-900 dark:text-sandstone-100">Messages</h1>
        <Button size="sm" onClick={onNewGroup} aria-label="New group chat">
          <Plus className="w-4 h-4" />
          New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <ConversationListSkeleton />}

        {isError && !isLoading && (
          <p className="p-6 text-center text-sm text-red-500">Couldn’t load conversations.</p>
        )}

        {!isLoading && !isError && conversations?.length === 0 && (
          <div className="text-center py-16 px-6 space-y-2">
            <MessageCircle className="w-8 h-8 text-sandstone-300 mx-auto" />
            <p className="text-sm text-sandstone-500 dark:text-sandstone-400">No conversations yet</p>
          </div>
        )}

        {!isLoading &&
          conversations?.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeId}
              onSelect={() => onSelect(conversation.id)}
            />
          ))}
      </div>
    </div>
  )
}

function ConversationListItem({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: ConversationSummaryDto
  isActive: boolean
  onSelect: () => void
}) {
  const currentPartnerId = useAuthStore((s) => s.partnerId)
  const title = conversationTitle(conversation, currentPartnerId)

  return (
    <button
      onClick={onSelect}
      aria-current={isActive}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-sandstone-50 dark:border-sandstone-800/50',
        isActive
          ? 'bg-forest-50 dark:bg-forest-900/20'
          : 'hover:bg-sandstone-50 dark:hover:bg-sandstone-800/40',
      )}
    >
      <Avatar
        src={conversation.participants[0]?.avatarUrl}
        name={title}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {conversation.isPinned && <Pin className="w-3 h-3 text-gold-500 shrink-0" />}
          <span className="text-sm font-medium text-sandstone-900 dark:text-sandstone-100 truncate">
            {title}
          </span>
        </div>
        <p className="text-xs text-sandstone-500 dark:text-sandstone-400 truncate">
          {conversation.lastMessagePreview ?? 'Say hello 👋'}
        </p>
      </div>
      <span className="text-[11px] text-sandstone-400 shrink-0">
        {relativeTime(conversation.lastActivityAt)}
      </span>
    </button>
  )
}

function ConversationListSkeleton() {
  return (
    <div className="p-4 space-y-3" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-sandstone-100 dark:bg-sandstone-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 bg-sandstone-100 dark:bg-sandstone-800 rounded" />
            <div className="h-2.5 w-2/3 bg-sandstone-100 dark:bg-sandstone-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
