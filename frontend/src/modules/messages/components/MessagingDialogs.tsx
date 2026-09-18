import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Pin, PinOff, Search, Trash2, X } from 'lucide-react'
import { connectApi } from '@/core/api/connect.api'
import { queryKeys } from '@/core/constants/query-keys'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { cn } from '@/core/utils/cn'
import type { ConversationDetailDto, ConversationSummaryDto } from '@/core/types/api.types'
import { useConversationMutations } from '../hooks/use-messaging'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal dialog with the behaviour `aria-modal="true"` promises.
 *
 * Previously it declared the role but implemented none of it (SAHA-D12): focus stayed on the
 * trigger outside the dialog, Tab wandered into the page a screen reader had been told was inert,
 * Escape did nothing, and closing dropped focus on the body. All four are handled here.
 */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  // Captured before focus moves, so it can be handed back on close.
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const panel = panelRef.current
    // Prefer the first real control; fall back to the panel so focus is never left outside.
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    return () => previouslyFocused.current?.focus?.()
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (focusable.length === 0) return

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const active = document.activeElement

    // Wrap at both ends so Tab and Shift+Tab stay inside the dialog.
    if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    } else if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault()
      last.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-sandstone-900 shadow-xl p-5 space-y-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-sandstone-900 dark:text-sandstone-100">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-copy-subtle">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function NewGroupDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (conversationId: string) => void
}) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const { createGroup } = useConversationMutations()

  const { data: connections } = useQuery({
    queryKey: queryKeys.connect.connections('Accepted'),
    queryFn: () => connectApi.getConnections('Accepted'),
  })

  const toggle = (coupleId: string) =>
    setSelected((prev) =>
      prev.includes(coupleId) ? prev.filter((id) => id !== coupleId) : [...prev, coupleId],
    )

  // Nothing is listed until the user searches — with many connections, showing them all is noise.
  // An empty query returns [] so the picker only reveals couples that match a name / Together ID.
  const filteredConnections = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return (connections ?? []).filter((c) =>
      [c.togetherID, c.husbandName, c.wifeName].some((v) => v?.toLowerCase().includes(q)),
    )
  }, [connections, search])

  const canCreate = name.trim().length > 0 && selected.length > 0

  return (
    <Modal title="New group chat" onClose={onClose}>
      <Input
        label="Group name"
        placeholder="Weekend crew"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
      />

      <div>
        <p className="text-xs font-medium text-copy-muted mb-2">Add connected couples</p>
        {!connections?.length ? (
          <p className="text-sm text-copy-subtle py-4 text-center">
            You have no connected couples yet.
          </p>
        ) : (
          <>
            <div className="mb-2">
              <Input
                placeholder="Search couples by name or Together ID"
                leftIcon={Search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search couples"
              />
            </div>
            {search.trim() === '' ? (
              <p className="text-sm text-copy-subtle py-4 text-center">
                Search by name or Together ID to add couples.
              </p>
            ) : filteredConnections.length === 0 ? (
              <p className="text-sm text-copy-subtle py-4 text-center">
                No couples match “{search.trim()}”.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {filteredConnections.map((c) => {
                  const isSelected = selected.includes(c.coupleId)
                  return (
                    <button
                      key={c.coupleId}
                      onClick={() => toggle(c.coupleId)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors',
                        isSelected
                          ? 'border-forest-300 bg-forest-50 dark:bg-forest-900/20'
                          : 'border-sandstone-100 dark:border-sandstone-800 hover:bg-sandstone-50',
                      )}
                    >
                      <div className="flex -space-x-2">
                        <Avatar src={c.husbandProfilePictureUrl} name={c.husbandName} size="xs" />
                        <Avatar src={c.wifeProfilePictureUrl} name={c.wifeName} size="xs" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.togetherID}</p>
                        <p className="text-xs text-copy-muted truncate">
                          {c.husbandName} & {c.wifeName}
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-forest-600" />}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!canCreate}
          loading={createGroup.isPending}
          onClick={() =>
            createGroup.mutate(
              { name: name.trim(), targetCoupleIds: selected },
              { onSuccess: (res) => onCreated(res.conversationId) },
            )
          }
        >
          Create
        </Button>
      </div>
    </Modal>
  )
}

export function ConversationSettingsDialog({
  detail,
  summary,
  onClose,
  onHidden,
}: {
  detail: ConversationDetailDto
  summary: ConversationSummaryDto | undefined
  onClose: () => void
  onHidden: () => void
}) {
  const [name, setName] = useState(detail.name ?? '')
  const { rename, addCouple, pin, hide } = useConversationMutations()

  const { data: connections } = useQuery({
    queryKey: queryKeys.connect.connections('Accepted'),
    queryFn: () => connectApi.getConnections('Accepted'),
  })

  const participantCoupleIds = useMemo(
    () => new Set(detail.participants.map((p) => p.coupleId)),
    [detail],
  )
  const addable = connections?.filter((c) => !participantCoupleIds.has(c.coupleId)) ?? []

  return (
    <Modal title="Conversation settings" onClose={onClose}>
      {detail.isOwner && (
        <div className="flex items-end gap-2">
          <Input
            label="Rename"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
          <Button
            size="sm"
            loading={rename.isPending}
            disabled={!name.trim() || name.trim() === detail.name}
            onClick={() => rename.mutate({ id: detail.id, name: name.trim() })}
          >
            Save
          </Button>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-copy-muted mb-2">Add a couple</p>
        {addable.length === 0 ? (
          <p className="text-sm text-copy-subtle">No eligible connected couples.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {addable.map((c) => (
              <div
                key={c.coupleId}
                className="flex items-center gap-3 p-2 rounded-xl border border-sandstone-100 dark:border-sandstone-800"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.togetherID}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  loading={addCouple.isPending}
                  onClick={() => addCouple.mutate({ id: detail.id, targetCoupleId: c.coupleId })}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-sandstone-100 dark:border-sandstone-800">
        <Button
          variant="outline"
          size="sm"
          onClick={() => pin.mutate({ id: detail.id, isPinned: !summary?.isPinned })}
          loading={pin.isPending}
        >
          {summary?.isPinned ? (
            <>
              <PinOff className="w-4 h-4" /> Unpin
            </>
          ) : (
            <>
              <Pin className="w-4 h-4" /> Pin
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-500"
          loading={hide.isPending}
          onClick={() => hide.mutate(detail.id, { onSuccess: onHidden })}
        >
          <Trash2 className="w-4 h-4" /> Hide
        </Button>
      </div>
    </Modal>
  )
}
