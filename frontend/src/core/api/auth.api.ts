import { apiClient } from './axios-instance'
import type {
  AuthResponseDto,
  AvailabilityDto,
  CreateInvitationResult,
  PartnerRole,
  SessionDto,
} from '@/core/types/api.types'

export interface LoginRequest {
  username: string
  password: string
}

/**
 * The registrant's half only. Their partner supplies their own details when they accept the
 * invitation — nobody ever types for the other person.
 */
export interface RegisterCoupleRequest {
  togetherID: string
  username: string
  name: string
  dateOfBirth: string
  email: string
  phoneNumber: string
  role: PartnerRole
  password: string
  confirmPassword: string
}

export interface AcceptInvitationRequest {
  token: string
  username: string
  name: string
  dateOfBirth: string
  email: string
  phoneNumber: string
}

export interface CreateInvitationRequest {
  inviteeName: string
  inviteeEmail: string
}

export interface ForgotPasswordRequest {
  togetherIDOrUsername: string
}

export interface ResetPasswordRequest {
  togetherIDOrUsername: string
  code: string
  newPassword: string
  confirmPassword: string
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponseDto> => {
    const response = await apiClient.post<AuthResponseDto>('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterCoupleRequest): Promise<AuthResponseDto> => {
    const response = await apiClient.post<AuthResponseDto>('/auth/register', data)
    return response.data
  },

  /** Boolean-only check backing the wizard's inline verdicts. Either field may be omitted. */
  checkAvailability: async (params: {
    username?: string
    togetherId?: string
  }): Promise<AvailabilityDto> => {
    const response = await apiClient.get<AvailabilityDto>('/auth/availability', { params })
    return response.data
  },

  /** The caller's live couple state — read from the couple, not the access token. */
  getSession: async (): Promise<SessionDto> => {
    const response = await apiClient.get<SessionDto>('/auth/session')
    return response.data
  },

  createInvitation: async (data: CreateInvitationRequest): Promise<CreateInvitationResult> => {
    const response = await apiClient.post<CreateInvitationResult>('/auth/invitations', data)
    return response.data
  },

  acceptInvitation: async (data: AcceptInvitationRequest): Promise<AuthResponseDto> => {
    const response = await apiClient.post<AuthResponseDto>('/auth/invitations/accept', data)
    return response.data
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    await apiClient.post('/auth/forgot-password', data)
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    await apiClient.post('/auth/reset-password', data)
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  refresh: async (): Promise<{ accessToken: string; expiresAt: string }> => {
    const response = await apiClient.post<{ accessToken: string; expiresAt: string }>(
      '/auth/refresh',
    )
    return response.data
  },
}
