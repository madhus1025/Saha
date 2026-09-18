import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  MoreVertical,
  Pencil,
  Send,
  Settings,
  SmilePlus,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/core/utils/cn'
import { useAuthStore } from '@/shared/stores/auth.store'
import type { ConversationDetailDto, MessageDto } from '@/core/types/api.types'
import { useMessages, useMessagingMutations } from '../hooks/use-messaging'
import { useMessagesStore } from '../messages.store'
import { REACTIONS, reactionEmoji } from '../schemas/messaging.schemas'
import { conversationTitle, participantSummary, relativeTime } from '../utils'

interface ChatThreadProps {
  conversationId: string
  detail: ConversationDetailDto | undefined
  onBack: () => void
  onOpenSettings: () => void
}

export function ChatThread({ conversationId, detail, onBack, onOpenSettings }: ChatThreadProps) {
  const currentPartnerId = useAuthStore((s) => s.partnerId)
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useMessages(conversationId)
  const { sendText, sendMedia, editMessage, deleteMessage, react, removeReaction } =
    useMessagingMutations(conversationId)

  const draft = useMessagesStore((s) => s.drafts[conversationId] ?? '')
  const setDraft = useMessagesStore((s) => s.setDraft)
  const clearDraft = useMessagesStore((s) => s.clearDraft)

  const [editing, setEditing] = useState<MessageDto | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Pages arrive newest-first; flatten and reverse so the thread renders oldest → newest.
  const messages = useMemo(
    () => (data?.pages.flatMap((p) => p.items) ?? []).slice().reverse(),
    [data],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages.length])

  const title = detail ? conversationTitle(detail, currentPartnerId) : 'Conversation'

  const handleSend = () => {
    const text = draft.trim()
    if (!text) return

    // The draft now survives until the server accepts, so it is still populated while a send is in
    // flight — a second Enter would send the same text twice. The Send button is disabled during
    // the request, but the Enter key bypasses it, so the guard has to live here.
    if (sendText.isPending || editMessage.isPending) return

    // Clear only once the server has accepted the message. Clearing at initiation meant a failed
    // send — 500, timeout, offline — silently destroyed what the user typed, with no draft left to
    // retry and no copy anywhere (SAHA-D15). The failure is likeliest on a poor connection, which
    // is exactly when a long message is most painful to lose.
    if (editing) {
      editMessage.mutate(
        { messageId: editing.id, body: text },
        {
          onSuccess: () => {
            setEditing(null)
            clearDraft(conversationId)
          },
        },
      )
    } else {
      sendText.mutate(text, { onSuccess: () => clearDraft(conversationId) })
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) sendMedia.mutate({ file })
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-sandstone-100 dark:border-sandstone-800">
        <button className="md:hidden p-1 -ml-1" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft className="w-5 h-5 text-copy-muted" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sandstone-900 dark:text-sandstone-100 truncate">
            {title}
          </p>
          {detail && (
            <p className="text-xs text-copy-subtle truncate">{participantSummary(detail)}</p>
          )}
        </div>
        {detail?.type === 'Group' && (
          <button onClick={onOpenSettings} aria-label="Conversation settings" className="p-1.5">
            <Settings className="w-4.5 h-4.5 text-copy-muted" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading && <p className="text-center text-sm text-copy-subtle py-8">Loading…</p>}
        {isError && (
          <p className="text-center text-sm text-red-500 py-8">Couldn’t load messages.</p>
        )}
        {!isLoading && !isError && messages.length === 0 && (
          <p className="text-center text-sm text-copy-subtle py-16">Say hello 👋</p>
        )}

        {hasNextPage && (
          <div className="text-center">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs text-forest-600 dark:text-sage-300 hover:underline py-2"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderPartnerId === currentPartnerId}
            onEdit={() => {
              setEditing(message)
              setDraft(conversationId, message.body ?? '')
            }}
            onDelete={() => deleteMessage.mutate(message.id)}
            onReact={(emoji) => react.mutate({ messageId: message.id, emoji })}
            onRemoveReaction={() => removeReaction.mutate(message.id)}
            currentPartnerId={currentPartnerId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-sandstone-100 dark:border-sandstone-800 p-3">
        {editing && (
          <div className="flex items-center justify-between mb-2 px-2 text-xs text-copy-muted">
            <span>Editing message</span>
            <button
              onClick={() => {
                setEditing(null)
                clearDraft(conversationId)
              }}
              className="text-forest-600 dark:text-sage-300"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFile}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-copy-subtle hover:text-forest-600 transition-colors"
            aria-label="Attach media"
            disabled={sendMedia.isPending}
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(conversationId, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={1}
            placeholder="Write a message…"
            aria-label="Message"
            className="flex-1 resize-none rounded-2xl border border-sandstone-200 dark:border-sandstone-700 bg-white dark:bg-sandstone-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300 max-h-32"
          />
          <Button
            size="sm"
            onClick={handleSend}
            loading={sendText.isPending || editMessage.isPending}
            disabled={!draft.trim()}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isOwn,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
  currentPartnerId,
}: {
  message: MessageDto
  isOwn: boolean
  onEdit: () => void
  onDelete: () => void
  onReact: (emoji: string) => void
  onRemoveReaction: () => void
  currentPartnerId: string | null
}) {
  const [showActions, setShowActions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)

  const myReaction = message.reactions.find(
    (r) => currentPartnerId && r.partnerIds.includes(currentPartnerId),
  )

  return (
    <div className={cn('flex gap-2 group', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && (
        <Avatar
          src={message.senderAvatarUrl}
          name={message.senderName}
          size="xs"
          className="mt-1"
        />
      )}
      <div className={cn('max-w-[75%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && (
          <span className="text-[11px] text-copy-subtle px-1 mb-0.5">{message.senderName}</span>
        )}

        <div className="relative">
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm break-words',
              message.isDeleted
                ? 'italic text-copy-subtle bg-sandstone-50 dark:bg-sandstone-800/50'
                : isOwn
                  ? 'bg-forest-600 text-white'
                  : 'bg-sandstone-100 dark:bg-sandstone-800 text-sandstone-900 dark:text-sandstone-100',
            )}
          >
            {message.isDeleted ? (
              'This message was deleted'
            ) : (
              <>
                {message.attachment && (
                  <MediaAttachment
                    url={message.attachment.url}
                    contentType={message.attachment.contentType}
                  />
                )}
                {message.body && <span>{message.body}</span>}
              </>
            )}
          </div>

          {/* Hover actions */}
          {!message.isDeleted && (
            <div
              className={cn(
                'absolute top-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
                isOwn ? '-left-16' : '-right-16',
              )}
            >
              <button
                onClick={() => setShowReactions((v) => !v)}
                aria-label="React"
                className="p-1 text-copy-subtle hover:text-forest-600"
              >
                <SmilePlus className="w-4 h-4" />
              </button>
              {isOwn && (
                <button
                  onClick={() => setShowActions((v) => !v)}
                  aria-label="Message actions"
                  className="p-1 text-copy-subtle hover:text-forest-600"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {showReactions && (
            <div
              className={cn(
                'absolute z-10 mt-1 flex gap-1 p-1.5 rounded-full bg-white dark:bg-sandstone-800 shadow-lg border border-sandstone-100 dark:border-sandstone-700',
                isOwn ? 'right-0' : 'left-0',
              )}
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.token}
                  onClick={() => {
                    onReact(r.token)
                    setShowReactions(false)
                  }}
                  aria-label={r.label}
                  className="text-lg hover:scale-125 transition-transform"
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}

          {showActions && isOwn && (
            <div
              className={cn(
                'absolute z-10 mt-1 flex flex-col rounded-xl bg-white dark:bg-sandstone-800 shadow-lg border border-sandstone-100 dark:border-sandstone-700 overflow-hidden',
                'right-0',
              )}
            >
              <button
                onClick={() => {
                  onEdit()
                  setShowActions(false)
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-sandstone-50 dark:hover:bg-sandstone-700"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => {
                  onDelete()
                  setShowActions(false)
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-sandstone-50 dark:hover:bg-sandstone-700"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Reactions summary */}
        {message.reactions.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {message.reactions.map((r) => {
              const mine = currentPartnerId && r.partnerIds.includes(currentPartnerId)
              return (
                <button
                  key={r.emoji}
                  onClick={() => (mine ? onRemoveReaction() : onReact(r.emoji))}
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border',
                    mine
                      ? 'bg-forest-50 border-forest-200 dark:bg-forest-900/30 dark:border-forest-700'
                      : 'bg-sandstone-50 border-sandstone-100 dark:bg-sandstone-800 dark:border-sandstone-700',
                  )}
                >
                  <span>{reactionEmoji(r.emoji)}</span>
                  <span className="text-copy-muted">{r.count}</span>
                </button>
              )
            })}
          </div>
        )}

        <span className="text-[10px] text-copy-subtle px-1 mt-0.5">
          {relativeTime(message.createdAt)}
          {message.isEdited && !message.isDeleted && ' · edited'}
          {myReaction ? '' : ''}
        </span>
      </div>
    </div>
  )
}

function MediaAttachment({ url, contentType }: { url: string; contentType: string }) {
  const isVideo = contentType.startsWith('video/')
  return (
    <div className="mb-1 rounded-lg overflow-hidden max-w-xs">
      {isVideo ? (
        <video src={url} controls className="max-w-full max-h-64 rounded-lg" />
      ) : (
        <img src={url} alt="attachment" className="max-w-full max-h-64 rounded-lg object-cover" />
      )}
    </div>
  )
}
