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
