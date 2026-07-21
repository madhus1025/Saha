import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PasswordStrengthMeter } from '../PasswordStrengthMeter'
import { assessPassphrase } from '../../utils/passphrase'

describe('assessPassphrase', () => {
  it('scores nothing for an empty password', () => {
    expect(assessPassphrase('')).toEqual({ score: 0, label: '' })
  })

  it('asks for length below the floor, without scolding', () => {
    const { score, label } = assessPassphrase('short')

    expect(score).toBe(0)
    expect(label).toContain('A little longer')
    expect(label).not.toMatch(/weak|invalid|error|must/i)
  })

  it('rewards a long, spoken passphrase', () => {
    const { score, label } = assessPassphrase('correct horse battery staple')

    expect(score).toBeGreaterThanOrEqual(3)
    expect(label).toContain('easy to say out loud')
  })

  it('gives a valid twelve-character password a real score', () => {
    // Weak but valid: warned about, never blocked.
    expect(assessPassphrase('aaaaaaaaaaaa').score).toBeGreaterThan(0)
  })

  it('refuses to score a passphrase past BCrypt’s 72-byte ceiling', () => {
    expect(assessPassphrase('😀'.repeat(30)).score).toBe(0)
  })
})

describe('PasswordStrengthMeter', () => {
  it('renders nothing until something is typed', () => {
    const { container } = render(<PasswordStrengthMeter password="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders four segments and no numeric score', () => {
    render(<PasswordStrengthMeter password="correct horse battery staple" />)

    const meter = screen.getByTestId('password-strength')
    expect(meter.querySelectorAll('div[class*="rounded-full"]')).toHaveLength(4)
    expect(meter.textContent).not.toMatch(/\d/)
  })

  it('announces its verdict as text, not colour alone', () => {
    render(<PasswordStrengthMeter password="correct horse battery staple" />)

    const verdict = screen.getByText(/easy to say out loud/i)
    expect(verdict).toHaveAttribute('aria-live', 'polite')
  })
})
