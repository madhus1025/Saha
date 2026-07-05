import { create } from 'zustand'

interface PartnerViewState {
  isViewingAsPartner: boolean
  partnerName: string | null
  enterPartnerView: (partnerName: string) => void
  exitPartnerView: () => void
}

export const usePartnerViewStore = create<PartnerViewState>((set) => ({
  isViewingAsPartner: false,
  partnerName: null,
  enterPartnerView: (partnerName: string) =>
    set({ isViewingAsPartner: true, partnerName }),
  exitPartnerView: () =>
    set({ isViewingAsPartner: false, partnerName: null }),
}))
