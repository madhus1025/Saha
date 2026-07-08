import { apiClient } from './axios-instance'
import type {
  ConversationDetailDto,
  ConversationSummaryDto,
  CreateGroupConversationResult,
  MessageDto,
  MessagePageDto,
} from '@/core/types/api.types'

const base = '/conversations'

export const messagingApi = {
  // ---- Conversations ----
  getConversations: async (): Promise<ConversationSummaryDto[]> => {
    const response = await apiClient.get<ConversationSummaryDto[]>(base)
    return response.data
  },

  getConversation: async (id: string): Promise<ConversationDetailDto> => {
    const response = await apiClient.get<ConversationDetailDto>(`${base}/${id}`)
    return response.data
  },

  createGroup: async (
    name: string,
    targetCoupleIds: string[],
  ): Promise<CreateGroupConversationResult> => {
    const response = await apiClient.post<CreateGroupConversationResult>(`${base}/group`, {
      name,
      targetCoupleIds,
    })
    return response.data
  },

  rename: async (id: string, name: string): Promise<void> => {
    await apiClient.put(`${base}/${id}/name`, { name })
  },

  addCouple: async (id: string, targetCoupleId: string): Promise<void> => {
    await apiClient.post(`${base}/${id}/couples`, { targetCoupleId })
  },

  pin: async (id: string): Promise<void> => {
    await apiClient.put(`${base}/${id}/pin`)
  },

  unpin: async (id: string): Promise<void> => {
    await apiClient.put(`${base}/${id}/unpin`)
  },

  hide: async (id: string): Promise<void> => {
    await apiClient.delete(`${base}/${id}`)
  },

  // ---- Messages ----
  getMessages: async (
    conversationId: string,
    before?: string | null,
    take = 30,
  ): Promise<MessagePageDto> => {
    const response = await apiClient.get<MessagePageDto>(`${base}/${conversationId}/messages`, {
      params: { before: before ?? undefined, take },
    })
    return response.data
  },

  sendText: async (conversationId: string, body: string): Promise<MessageDto> => {
    const response = await apiClient.post<MessageDto>(`${base}/${conversationId}/messages`, { body })
    return response.data
  },

  sendMedia: async (
    conversationId: string,
    file: File,
    caption?: string,
  ): Promise<MessageDto> => {
    const form = new FormData()
    form.append('file', file)
    if (caption) form.append('caption', caption)
    const response = await apiClient.post<MessageDto>(
      `${base}/${conversationId}/messages/media`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },

  editMessage: async (
    conversationId: string,
    messageId: string,
    body: string,
  ): Promise<MessageDto> => {
    const response = await apiClient.put<MessageDto>(
      `${base}/${conversationId}/messages/${messageId}`,
      { body },
    )
    return response.data
  },

  deleteMessage: async (conversationId: string, messageId: string): Promise<void> => {
    await apiClient.delete(`${base}/${conversationId}/messages/${messageId}`)
  },

  react: async (conversationId: string, messageId: string, emoji: string): Promise<void> => {
    await apiClient.put(`${base}/${conversationId}/messages/${messageId}/reaction`, { emoji })
  },

  removeReaction: async (conversationId: string, messageId: string): Promise<void> => {
    await apiClient.delete(`${base}/${conversationId}/messages/${messageId}/reaction`)
  },
}
