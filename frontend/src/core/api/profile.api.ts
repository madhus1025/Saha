import { apiClient } from './axios-instance'
import type { ProfileDto, UploadProfilePictureResult } from '@/core/types/api.types'

export interface UpdateProfileRequest {
  name: string
  dateOfBirth: string
  email: string
  phoneNumber: string
}

export const profileApi = {
  getMyProfile: async (): Promise<ProfileDto> => {
    const response = await apiClient.get<ProfileDto>('/profile/me')
    return response.data
  },

  getPartnerProfile: async (): Promise<ProfileDto> => {
    const response = await apiClient.get<ProfileDto>('/profile/partner')
    return response.data
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<void> => {
    await apiClient.put('/profile/me', data)
  },

  uploadProfilePicture: async (file: File): Promise<UploadProfilePictureResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<UploadProfilePictureResult>(
      '/profile/me/picture',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },
}
