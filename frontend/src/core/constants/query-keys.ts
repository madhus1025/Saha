export const queryKeys = {
  auth: {
    profile: ['auth', 'profile'] as const,
    partnerProfile: ['auth', 'partnerProfile'] as const,
  },
  profile: {
    me: ['profile', 'me'] as const,
    partner: ['profile', 'partner'] as const,
  },
  connect: {
    connections: (status?: string) =>
      status ? ['connect', 'connections', status] : ['connect', 'connections'],
    search: (query: string) => ['connect', 'search', query] as const,
  },
  messages: {
    conversations: ['messages', 'conversations'] as const,
    conversation: (id: string) => ['messages', 'conversation', id] as const,
    thread: (id: string) => ['messages', 'thread', id] as const,
  },
} as const
