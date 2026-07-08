import { create } from 'zustand'

/**
 * UI-only state for the messaging module. No server data lives here (that is TanStack Query's job) —
 * only ephemeral view state: the active conversation and per-conversation composer drafts.
 */
interface MessagesUiState {
  activeConversationId: string | null
  drafts: Record<string, string>

  setActiveConversation: (id: string | null) => void
  setDraft: (conversationId: string, text: string) => void
  clearDraft: (conversationId: string) => void
}

export const useMessagesStore = create<MessagesUiState>((set) => ({
  activeConversationId: null,
  drafts: {},

  setActiveConversation: (id) => set({ activeConversationId: id }),
  setDraft: (conversationId, text) =>
    set((state) => ({ drafts: { ...state.drafts, [conversationId]: text } })),
  clearDraft: (conversationId) =>
    set((state) => {
      const drafts = { ...state.drafts }
      delete drafts[conversationId]
      return { drafts }
    }),
}))
