export interface ApiError {
  code: string
  message: string
  errors?: Record<string, string[]>
}

export interface ApiResponse<T> {
  data: T
}

export type PartnerRole = 'Husband' | 'Wife'
export type ConnectionStatus = 'Pending' | 'Accepted' | 'Rejected'

export interface PartnerSummary {
  partnerId: string
  username: string
  name: string
  profilePictureUrl: string | null
  role: PartnerRole
}

export interface CoupleInfo {
  coupleId: string
  togetherID: string
  partner: PartnerSummary
}

export interface ProfileDto {
  partnerId: string
  username: string
  name: string
  dateOfBirth: string
  email: string
  phoneNumber: string
  profilePictureUrl: string | null
  role: PartnerRole
  coupleInfo: CoupleInfo
}

export interface LoginResponseDto {
  accessToken: string
  expiresAt: string
  coupleId: string
  partnerId: string
  username: string
  partnerName: string
  togetherID: string
  role: PartnerRole
  profilePictureUrl: string | null
}

export interface RegisterCoupleResult {
  coupleId: string
  togetherID: string
}

export interface ConnectionDto {
  connectionId: string
  coupleId: string
  togetherID: string
  husbandName: string
  wifeName: string
  husbandProfilePictureUrl: string | null
  wifeProfilePictureUrl: string | null
  status: ConnectionStatus
  isInitiator: boolean
  createdAt: string
  acceptedAt: string | null
}

export interface CoupleSearchResultDto {
  togetherID: string
  husbandName: string
  wifeName: string
  husbandProfilePictureUrl: string | null
  wifeProfilePictureUrl: string | null
  existingConnectionStatus: ConnectionStatus | null
}

export interface SendConnectionRequestResult {
  connectionId: string
}

export interface UploadProfilePictureResult {
  profilePictureUrl: string
}

// ---- Messaging (couple-messaging feature) --------------------------------------------------

export type ConversationType = 'Partner' | 'Group'
export type MessageContentType = 'Text' | 'Image' | 'Video'
export type ReactionToken = 'heart' | 'laugh' | 'wow' | 'sad' | 'thumbsup' | 'fire'

export interface ParticipantDto {
  partnerId: string
  coupleId: string
  name: string
  role: PartnerRole
  avatarUrl: string | null
}

export interface ReactionSummaryDto {
  emoji: string
  count: number
  partnerIds: string[]
}

export interface MessageAttachmentDto {
  url: string
  contentType: string
  fileName: string
  sizeBytes: number
}

export interface MessageDto {
  id: string
  conversationId: string
  senderPartnerId: string
  senderName: string
  senderRole: PartnerRole
  senderAvatarUrl: string | null
  contentType: MessageContentType
  body: string | null
  attachment: MessageAttachmentDto | null
  isEdited: boolean
  editedAt: string | null
  isDeleted: boolean
  createdAt: string
  reactions: ReactionSummaryDto[]
}

export interface MessagePageDto {
  items: MessageDto[]
  nextCursor: string | null
}

export interface ConversationSummaryDto {
  id: string
  type: ConversationType
  name: string | null
  participants: ParticipantDto[]
  lastMessagePreview: string | null
  lastMessageSenderPartnerId: string | null
  lastActivityAt: string
  isPinned: boolean
  isOwner: boolean
}

export interface ConversationDetailDto {
  id: string
  type: ConversationType
  name: string | null
  ownerCoupleId: string | null
  isOwner: boolean
  participants: ParticipantDto[]
}

export interface CreateGroupConversationResult {
  conversationId: string
}
