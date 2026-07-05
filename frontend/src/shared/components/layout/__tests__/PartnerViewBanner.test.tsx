import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PartnerViewBanner } from '../PartnerViewBanner'
import { usePartnerViewStore } from '@/shared/stores/partner-view.store'

vi.mock('@/shared/stores/partner-view.store')
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockExitPartnerView = vi.fn()

describe('PartnerViewBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render banner when viewing as partner', () => {
    vi.mocked(usePartnerViewStore).mockReturnValue({
      isViewingAsPartner: true,
      partnerName: 'Priya Avinash',
      enterPartnerView: vi.fn(),
      exitPartnerView: mockExitPartnerView,
    })

    render(<PartnerViewBanner />)

    expect(screen.getByText(/Viewing as Priya Avinash/i)).toBeInTheDocument()
    expect(screen.getByText(/Read Only Mode/i)).toBeInTheDocument()
  })

  it('should not render banner content when not in partner view mode', () => {
    vi.mocked(usePartnerViewStore).mockReturnValue({
      isViewingAsPartner: false,
      partnerName: null,
      enterPartnerView: vi.fn(),
      exitPartnerView: mockExitPartnerView,
    })

    render(<PartnerViewBanner />)

    expect(screen.queryByText(/Read Only Mode/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /exit partner view/i })).not.toBeInTheDocument()
  })

  it('should call exitPartnerView when exit button is clicked', () => {
    vi.mocked(usePartnerViewStore).mockReturnValue({
      isViewingAsPartner: true,
      partnerName: 'Priya',
      enterPartnerView: vi.fn(),
      exitPartnerView: mockExitPartnerView,
    })

    render(<PartnerViewBanner />)

    const exitButton = screen.getByRole('button', { name: /exit partner view/i })
    fireEvent.click(exitButton)

    expect(mockExitPartnerView).toHaveBeenCalledTimes(1)
  })
})
