import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/core/utils/cn'
import { ConversationList } from '../components/ConversationList'
import { ChatThread } from '../components/ChatThread'
import { NewGroupDialog, ConversationSettingsDialog } from '../components/MessagingDialogs'
import { useConversations, useConversationDetail } from '../hooks/use-messaging'
import { useMessagesStore } from '../messages.store'

export function MessagesPage() {
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const activeId = conversationId ?? null

  const setActiveConversation = useMessagesStore((s) => s.setActiveConversation)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const { data: conversations, isLoading, isError } = useConversations()
  const { data: detail } = useConversationDetail(activeId)

  useEffect(() => {
    setActiveConversation(activeId)
  }, [activeId, setActiveConversation])

  const activeSummary = conversations?.find((c) => c.id === activeId)

  const selectConversation = (id: string) => navigate(`/messages/${id}`)
  const backToList = () => navigate('/messages')

  return (
    <div className="h-[calc(100vh-8rem)] max-w-5xl mx-auto rounded-2xl overflow-hidden border border-sandstone-100 dark:border-sandstone-800 bg-white dark:bg-sandstone-900">
      <div className="grid h-full md:grid-cols-[320px_1fr]">
        {/* Master: conversation list. Hidden on mobile when a thread is open. */}
        <div
          className={cn(
            'h-full border-r border-sandstone-100 dark:border-sandstone-800',
            activeId ? 'hidden md:block' : 'block',
          )}
        >
          <ConversationList
            conversations={conversations}
            isLoading={isLoading}
            isError={isError}
            activeId={activeId}
            onSelect={selectConversation}
            onNewGroup={() => setShowNewGroup(true)}
          />
        </div>

        {/* Detail: thread. Hidden on mobile when no thread is selected. */}
        <div className={cn('h-full', activeId ? 'block' : 'hidden md:block')}>
          {activeId ? (
            <ChatThread
              key={activeId}
              conversationId={activeId}
              detail={detail}
              onBack={backToList}
              onOpenSettings={() => setShowSettings(true)}
            />
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center gap-2 text-sandstone-400">
              <MessageCircle className="w-10 h-10" />
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {showNewGroup && (
        <NewGroupDialog
          onClose={() => setShowNewGroup(false)}
          onCreated={(id) => {
            setShowNewGroup(false)
            selectConversation(id)
          }}
        />
      )}

      {showSettings && detail && (
        <ConversationSettingsDialog
          detail={detail}
          summary={activeSummary}
          onClose={() => setShowSettings(false)}
          onHidden={() => {
            setShowSettings(false)
            backToList()
          }}
        />
      )}
    </div>
  )
}
