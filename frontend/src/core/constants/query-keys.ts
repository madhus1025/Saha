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
} as const
