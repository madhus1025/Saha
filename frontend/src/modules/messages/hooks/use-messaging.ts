import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { messagingApi } from '@/core/api/messaging.api'
import { queryKeys } from '@/core/constants/query-keys'
import { toast } from '@/shared/hooks/use-toast'
import { extractApiError } from '@/core/utils/error.utils'
import type { MessagePageDto } from '@/core/types/api.types'

const errorToast = (title: string) => (error: unknown) =>
  toast({ title, description: extractApiError(error).message, variant: 'error' })

// ---- Queries -------------------------------------------------------------------------------

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.messages.conversations,
    queryFn: messagingApi.getConversations,
  })
}

export function useConversationDetail(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.messages.conversation(id) : ['messages', 'conversation', 'none'],
    queryFn: () => messagingApi.getConversation(id!),
    enabled: !!id,
  })
}

export function useMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: conversationId
      ? queryKeys.messages.thread(conversationId)
      : ['messages', 'thread', 'none'],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      messagingApi.getMessages(conversationId!, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: MessagePageDto) => lastPage.nextCursor,
    enabled: !!conversationId,
  })
}

// ---- Mutations -----------------------------------------------------------------------------

export function useMessagingMutations(conversationId: string | null) {
  const queryClient = useQueryClient()

  const invalidateThread = () => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.thread(conversationId) })
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations })
  }

  const sendText = useMutation({
    mutationFn: (body: string) => messagingApi.sendText(conversationId!, body),
    onSuccess: invalidateThread,
    onError: errorToast('Could not send message'),
  })

  const sendMedia = useMutation({
    mutationFn: ({ file, caption }: { file: File; caption?: string }) =>
      messagingApi.sendMedia(conversationId!, file, caption),
    onSuccess: invalidateThread,
    onError: errorToast('Could not send media'),
  })

  const editMessage = useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      messagingApi.editMessage(conversationId!, messageId, body),
    onSuccess: invalidateThread,
    onError: errorToast('Could not edit message'),
  })

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => messagingApi.deleteMessage(conversationId!, messageId),
    onSuccess: invalidateThread,
    onError: errorToast('Could not delete message'),
  })

  const react = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      messagingApi.react(conversationId!, messageId, emoji),
    onSuccess: invalidateThread,
    onError: errorToast('Could not react'),
  })

  const removeReaction = useMutation({
    mutationFn: (messageId: string) => messagingApi.removeReaction(conversationId!, messageId),
    onSuccess: invalidateThread,
    onError: errorToast('Could not remove reaction'),
  })

  return { sendText, sendMedia, editMessage, deleteMessage, react, removeReaction }
}

export function useConversationMutations() {
  const queryClient = useQueryClient()
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations })
  const invalidateDetail = (id: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(id) })

  const createGroup = useMutation({
    mutationFn: ({ name, targetCoupleIds }: { name: string; targetCoupleIds: string[] }) =>
      messagingApi.createGroup(name, targetCoupleIds),
    onSuccess: invalidateList,
    onError: errorToast('Could not create group'),
  })

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => messagingApi.rename(id, name),
    onSuccess: (_data, { id }) => {
      invalidateList()
      invalidateDetail(id)
      toast({ title: 'Conversation renamed', variant: 'success' })
    },
    onError: errorToast('Could not rename'),
  })

  const addCouple = useMutation({
    mutationFn: ({ id, targetCoupleId }: { id: string; targetCoupleId: string }) =>
      messagingApi.addCouple(id, targetCoupleId),
    onSuccess: (_data, { id }) => {
      invalidateList()
      invalidateDetail(id)
      toast({ title: 'Couple added', variant: 'success' })
    },
    onError: errorToast('Could not add couple'),
  })

  const pin = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      isPinned ? messagingApi.pin(id) : messagingApi.unpin(id),
    onSuccess: invalidateList,
    onError: errorToast('Could not update pin'),
  })

  const hide = useMutation({
    mutationFn: (id: string) => messagingApi.hide(id),
    onSuccess: () => {
      invalidateList()
      toast({ title: 'Conversation hidden', variant: 'default' })
    },
    onError: errorToast('Could not hide conversation'),
  })

  return { createGroup, rename, addCouple, pin, hide }
}
