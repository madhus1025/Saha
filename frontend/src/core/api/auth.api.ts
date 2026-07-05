import { apiClient } from './axios-instance'
import type { LoginResponseDto, RegisterCoupleResult } from '@/core/types/api.types'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterCoupleRequest {
  togetherID: string
  husbandUsername: string
  husbandName: string
  husbandDateOfBirth: string
  husbandEmail: string
  husbandPhoneNumber: string
  wifeUsername: string
  wifeName: string
  wifeDateOfBirth: string
  wifeEmail: string
  wifePhoneNumber: string
  password: string
  confirmPassword: string
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
  login: async (data: LoginRequest): Promise<LoginResponseDto> => {
    const response = await apiClient.post<LoginResponseDto>('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterCoupleRequest): Promise<RegisterCoupleResult> => {
    const response = await apiClient.post<RegisterCoupleResult>('/auth/register', data)
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
