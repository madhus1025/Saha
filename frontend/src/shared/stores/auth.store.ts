import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { LoginResponseDto, PartnerRole } from '@/core/types/api.types'

interface AuthState {
  accessToken: string | null
  coupleId: string | null
  partnerId: string | null
  username: string | null
  partnerName: string | null
  togetherID: string | null
  role: PartnerRole | null
  profilePictureUrl: string | null
  isAuthenticated: boolean

  setAuthData: (data: LoginResponseDto) => void
  setAccessToken: (token: string) => void
  updateProfilePicture: (url: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      coupleId: null,
      partnerId: null,
      username: null,
      partnerName: null,
      togetherID: null,
      role: null,
      profilePictureUrl: null,
      isAuthenticated: false,

      setAuthData: (data: LoginResponseDto) =>
        set({
          accessToken: data.accessToken,
          coupleId: data.coupleId,
          partnerId: data.partnerId,
          username: data.username,
          partnerName: data.partnerName,
          togetherID: data.togetherID,
          role: data.role,
          profilePictureUrl: data.profilePictureUrl,
          isAuthenticated: true,
        }),

      setAccessToken: (token: string) =>
        set({ accessToken: token }),

      updateProfilePicture: (url: string | null) =>
        set({ profilePictureUrl: url?.includes('placeholder.local') ? null : url }),

      logout: () =>
        set({
          accessToken: null,
          coupleId: null,
          partnerId: null,
          username: null,
          partnerName: null,
          togetherID: null,
          role: null,
          profilePictureUrl: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'saha-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.profilePictureUrl?.includes('placeholder.local')) {
          state.profilePictureUrl = null
        }
      },
      partialize: (state) => ({
        coupleId: state.coupleId,
        partnerId: state.partnerId,
        username: state.username,
        partnerName: state.partnerName,
        togetherID: state.togetherID,
        role: state.role,
        profilePictureUrl: state.profilePictureUrl,
        isAuthenticated: state.isAuthenticated,
        // Do NOT persist the access token — it should be refreshed on app boot
      }),
    },
  ),
)
