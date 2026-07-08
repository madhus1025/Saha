import type { Page } from '@playwright/test'

// ---- Identities -----------------------------------------------------------------------------

export const ME_COUPLE = '11111111-1111-1111-1111-111111111111'
export const ME_HUSBAND = '22222222-2222-2222-2222-222222222222' // the authenticated partner
export const ME_WIFE = '22222222-2222-2222-2222-2222222222ww'

export const B_COUPLE = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
export const B_HUSBAND = 'bbbbbbbb-0000-0000-0000-000000000001'
export const B_WIFE = 'bbbbbbbb-0000-0000-0000-000000000002'

export const C_COUPLE = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
export const C_HUSBAND = 'cccccccc-0000-0000-0000-000000000001'
export const C_WIFE = 'cccccccc-0000-0000-0000-000000000002'

export const authState = JSON.stringify({
  state: {
    isAuthenticated: true,
    accessToken: 'test-token',
    username: 'madhu',
    partnerName: 'Priya Avinash',
    togetherID: 'MADHU-PRIYA',
    coupleId: ME_COUPLE,
    partnerId: ME_HUSBAND,
    role: 'Husband',
    profilePictureUrl: null,
  },
  version: 0,
})

// Registry of couples used to build participant rows for groups.
const COUPLES: Record<
  string,
  { togetherID: string; husband: Party; wife: Party }
> = {
  [ME_COUPLE]: {
    togetherID: 'MADHU-PRIYA',
    husband: { partnerId: ME_HUSBAND, coupleId: ME_COUPLE, name: 'Madhu', role: 'Husband' },
    wife: { partnerId: ME_WIFE, coupleId: ME_COUPLE, name: 'Priya', role: 'Wife' },
  },
  [B_COUPLE]: {
    togetherID: 'RAVI-KAVYA',
    husband: { partnerId: B_HUSBAND, coupleId: B_COUPLE, name: 'Ravi', role: 'Husband' },
    wife: { partnerId: B_WIFE, coupleId: B_COUPLE, name: 'Kavya', role: 'Wife' },
  },
  [C_COUPLE]: {
    togetherID: 'ALEX-MIA',
    husband: { partnerId: C_HUSBAND, coupleId: C_COUPLE, name: 'Alex', role: 'Husband' },
    wife: { partnerId: C_WIFE, coupleId: C_COUPLE, name: 'Mia', role: 'Wife' },
  },
}

interface Party {
  partnerId: string
  coupleId: string
  name: string
  role: 'Husband' | 'Wife'
}

interface MockMessage {
  id: string
  senderPartnerId: string
  senderName: string
  senderRole: 'Husband' | 'Wife'
  contentType: 'Text' | 'Image' | 'Video'
  body: string | null
  attachment: { url: string; contentType: string; fileName: string; sizeBytes: number } | null
  isEdited: boolean
  isDeleted: boolean
  createdAt: string
  reactionsByPartner: Record<string, string> // partnerId -> token
}

interface MockConversation {
  id: string
  type: 'Partner' | 'Group'
  name: string | null
  ownerCoupleId: string | null
  participantCoupleIds: string[]
  isPinned: boolean
  isHidden: boolean
  lastMessagePreview: string | null
  lastActivityAt: string
  messages: MockMessage[]
}

export interface MessagingState {
  conversations: MockConversation[]
  /** coupleIds the current couple is Accepted-connected to (drives the pickers). */
  connectedCoupleIds: string[]
  seq: number
}

// ---- Serialization (mock entity -> API DTO) -------------------------------------------------

function participants(conv: MockConversation) {
  return conv.participantCoupleIds.flatMap((cid) => {
    const c = COUPLES[cid]
    return [toParticipant(c.husband), toParticipant(c.wife)]
  })
}

function toParticipant(p: Party) {
  return { partnerId: p.partnerId, coupleId: p.coupleId, name: p.name, role: p.role, avatarUrl: null }
}

function toSummary(conv: MockConversation) {
  return {
    id: conv.id,
    type: conv.type,
    name: conv.name,
    participants: participants(conv),
    lastMessagePreview: conv.lastMessagePreview,
    lastMessageSenderPartnerId: null,
    lastActivityAt: conv.lastActivityAt,
    isPinned: conv.isPinned,
    isOwner: conv.ownerCoupleId === ME_COUPLE,
  }
}

function toDetail(conv: MockConversation) {
  return {
    id: conv.id,
    type: conv.type,
    name: conv.name,
    ownerCoupleId: conv.ownerCoupleId,
    isOwner: conv.ownerCoupleId === ME_COUPLE,
    participants: participants(conv),
  }
}

function toMessageDto(m: MockMessage, conversationId: string) {
  const grouped: Record<string, string[]> = {}
  for (const [partnerId, token] of Object.entries(m.reactionsByPartner)) {
    ;(grouped[token] ??= []).push(partnerId)
  }
  return {
    id: m.id,
    conversationId,
    senderPartnerId: m.senderPartnerId,
    senderName: m.senderName,
    senderRole: m.senderRole,
    senderAvatarUrl: null,
    contentType: m.contentType,
    body: m.body,
    attachment: m.attachment,
    isEdited: m.isEdited,
    editedAt: m.isEdited ? '2026-07-08T10:05:00Z' : null,
    isDeleted: m.isDeleted,
    createdAt: m.createdAt,
    reactions: Object.entries(grouped).map(([emoji, partnerIds]) => ({
      emoji,
      count: partnerIds.length,
      partnerIds,
    })),
  }
}

// ---- Factories ------------------------------------------------------------------------------

export function makeMessage(overrides: Partial<MockMessage> & { id: string }): MockMessage {
  return {
    senderPartnerId: ME_HUSBAND,
    senderName: 'Madhu',
    senderRole: 'Husband',
    contentType: 'Text',
    body: 'hello',
    attachment: null,
    isEdited: false,
    isDeleted: false,
    createdAt: '2026-07-08T09:00:00Z',
    reactionsByPartner: {},
    ...overrides,
  }
}

/** Default world: a partner conversation (with two messages) + one group I own with couple B. */
export function defaultState(): MessagingState {
  return {
    connectedCoupleIds: [B_COUPLE, C_COUPLE],
    seq: 100,
    conversations: [
      {
        id: 'partner-1',
        type: 'Partner',
        name: null,
        ownerCoupleId: null,
        participantCoupleIds: [ME_COUPLE],
        isPinned: true,
        isHidden: false,
        lastMessagePreview: 'See you tonight',
        lastActivityAt: '2026-07-08T10:00:00Z',
        messages: [
          makeMessage({ id: 'm1', body: 'On my way', createdAt: '2026-07-08T09:59:00Z' }),
          makeMessage({
            id: 'm2',
            body: 'See you tonight',
            senderPartnerId: ME_WIFE,
            senderName: 'Priya',
            senderRole: 'Wife',
            createdAt: '2026-07-08T10:00:00Z',
          }),
        ],
      },
      {
        id: 'group-1',
        type: 'Group',
        name: 'Trip Crew',
        ownerCoupleId: ME_COUPLE,
        participantCoupleIds: [ME_COUPLE, B_COUPLE],
        isPinned: false,
        isHidden: false,
        lastMessagePreview: 'Who is driving?',
        lastActivityAt: '2026-07-08T09:00:00Z',
        messages: [makeMessage({ id: 'g1', body: 'Who is driving?' })],
      },
    ],
  }
}

// ---- Route wiring ---------------------------------------------------------------------------

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

/**
 * Installs a single stateful fake backend for every messaging + connections request. Mutations
 * update `state` so the subsequent invalidation-driven refetch reflects the change — exactly how
 * the real app behaves.
 */
export async function setupMessagingApi(page: Page, state: MessagingState): Promise<void> {
  const find = (id: string) => state.conversations.find((c) => c.id === id)

  await page.route(
    (url) =>
      url.pathname.includes('/conversations') || url.pathname.includes('/connect/connections'),
    async (route) => {
      const req = route.request()
      const method = req.method()
      const path = new URL(req.url()).pathname
      const seg = path.split('/').filter(Boolean)
      const idx = seg.indexOf('conversations')

      // /connect/connections?status=Accepted
      if (path.includes('/connect/connections')) {
        const accepted = state.connectedCoupleIds.map((cid) => ({
          connectionId: `conn-${cid}`,
          coupleId: cid,
          togetherID: COUPLES[cid].togetherID,
          husbandName: COUPLES[cid].husband.name,
          wifeName: COUPLES[cid].wife.name,
          husbandProfilePictureUrl: null,
          wifeProfilePictureUrl: null,
          status: 'Accepted',
          isInitiator: true,
          createdAt: '2026-06-01T00:00:00Z',
          acceptedAt: '2026-06-01T00:00:00Z',
        }))
        return route.fulfill(json(accepted))
      }

      const rest = seg.slice(idx + 1) // segments after "conversations"

      // GET /conversations
      if (rest.length === 0 && method === 'GET') {
        return route.fulfill(
          json(state.conversations.filter((c) => !c.isHidden).map(toSummary)),
        )
      }

      // POST /conversations/group
      if (rest[0] === 'group' && method === 'POST') {
        const data = req.postDataJSON() as { name: string; targetCoupleIds: string[] }
        const id = `group-${++state.seq}`
        state.conversations.unshift({
          id,
          type: 'Group',
          name: data.name,
          ownerCoupleId: ME_COUPLE,
          participantCoupleIds: [ME_COUPLE, ...data.targetCoupleIds],
          isPinned: false,
          isHidden: false,
          lastMessagePreview: null,
          lastActivityAt: new Date().toISOString(),
          messages: [],
        })
        return route.fulfill(json({ conversationId: id }, 201))
      }

      const conv = find(rest[0])
      if (!conv) return route.fulfill(json({ code: 'NOT_FOUND', message: 'Not found' }, 404))

      // GET /conversations/:id
      if (rest.length === 1 && method === 'GET') return route.fulfill(json(toDetail(conv)))

      // DELETE /conversations/:id  (hide)
      if (rest.length === 1 && method === 'DELETE') {
        conv.isHidden = true
        return route.fulfill({ status: 204, body: '' })
      }

      // PUT /conversations/:id/name
      if (rest[1] === 'name' && method === 'PUT') {
        conv.name = (req.postDataJSON() as { name: string }).name
        return route.fulfill({ status: 204, body: '' })
      }

      // PUT /conversations/:id/pin | /unpin
      if (rest[1] === 'pin' && method === 'PUT') {
        conv.isPinned = true
        return route.fulfill({ status: 204, body: '' })
      }
      if (rest[1] === 'unpin' && method === 'PUT') {
        conv.isPinned = false
        return route.fulfill({ status: 204, body: '' })
      }

      // POST /conversations/:id/couples
      if (rest[1] === 'couples' && method === 'POST') {
        const { targetCoupleId } = req.postDataJSON() as { targetCoupleId: string }
        if (!conv.participantCoupleIds.includes(targetCoupleId))
          conv.participantCoupleIds.push(targetCoupleId)
        return route.fulfill({ status: 204, body: '' })
      }

      // /conversations/:id/messages...
      if (rest[1] === 'messages') {
        // GET list
        if (rest.length === 2 && method === 'GET') {
          const items = conv.messages
            .slice()
            .reverse()
            .map((m) => toMessageDto(m, conv.id))
          return route.fulfill(json({ items, nextCursor: null }))
        }
        // POST send text
        if (rest.length === 2 && method === 'POST') {
          const { body } = req.postDataJSON() as { body: string }
          const msg = makeMessage({
            id: `m-${++state.seq}`,
            body,
            createdAt: new Date().toISOString(),
          })
          conv.messages.push(msg)
          conv.lastMessagePreview = body
          return route.fulfill(json(toMessageDto(msg, conv.id), 201))
        }
        // POST send media
        if (rest[2] === 'media' && method === 'POST') {
          const msg = makeMessage({
            id: `media-${++state.seq}`,
            body: null,
            contentType: 'Image',
            attachment: {
              url: 'https://blob.test/messages/photo.jpg',
              contentType: 'image/jpeg',
              fileName: 'photo.jpg',
              sizeBytes: 4,
            },
            createdAt: new Date().toISOString(),
          })
          conv.messages.push(msg)
          return route.fulfill(json(toMessageDto(msg, conv.id), 201))
        }

        const messageId = rest[2]
        const msg = conv.messages.find((m) => m.id === messageId)
        if (!msg) return route.fulfill(json({ code: 'NOT_FOUND', message: 'gone' }, 404))

        // reaction
        if (rest[3] === 'reaction') {
          if (method === 'PUT') {
            const { emoji } = req.postDataJSON() as { emoji: string }
            msg.reactionsByPartner[ME_HUSBAND] = emoji
            return route.fulfill({ status: 204, body: '' })
          }
          if (method === 'DELETE') {
            delete msg.reactionsByPartner[ME_HUSBAND]
            return route.fulfill({ status: 204, body: '' })
          }
        }

        // PUT edit
        if (rest.length === 3 && method === 'PUT') {
          msg.body = (req.postDataJSON() as { body: string }).body
          msg.isEdited = true
          return route.fulfill(json(toMessageDto(msg, conv.id)))
        }
        // DELETE
        if (rest.length === 3 && method === 'DELETE') {
          msg.isDeleted = true
          msg.body = null
          msg.attachment = null
          msg.reactionsByPartner = {}
          return route.fulfill({ status: 204, body: '' })
        }
      }

      return route.fulfill(json({ code: 'UNHANDLED', message: path, method } as unknown, 500))
    },
  )
}
