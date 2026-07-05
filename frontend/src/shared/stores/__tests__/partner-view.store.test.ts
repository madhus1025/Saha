import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { usePartnerViewStore } from '../partner-view.store'

describe('usePartnerViewStore', () => {
  beforeEach(() => {
    act(() => {
      usePartnerViewStore.getState().exitPartnerView()
    })
  })

  it('should have false initial state', () => {
    const state = usePartnerViewStore.getState()

    expect(state.isViewingAsPartner).toBe(false)
    expect(state.partnerName).toBeNull()
  })

  it('should enter partner view mode', () => {
    act(() => {
      usePartnerViewStore.getState().enterPartnerView('Priya Avinash')
    })

    const state = usePartnerViewStore.getState()
    expect(state.isViewingAsPartner).toBe(true)
    expect(state.partnerName).toBe('Priya Avinash')
  })

  it('should exit partner view mode', () => {
    act(() => {
      usePartnerViewStore.getState().enterPartnerView('Priya')
    })
    act(() => {
      usePartnerViewStore.getState().exitPartnerView()
    })

    const state = usePartnerViewStore.getState()
    expect(state.isViewingAsPartner).toBe(false)
    expect(state.partnerName).toBeNull()
  })

  it('should not be persisted to localStorage', () => {
    act(() => {
      usePartnerViewStore.getState().enterPartnerView('Priya')
    })

    const keys = Object.keys(localStorage)
    const partnerViewKey = keys.find(k => k.includes('partner-view'))
    expect(partnerViewKey).toBeUndefined()
  })
})
