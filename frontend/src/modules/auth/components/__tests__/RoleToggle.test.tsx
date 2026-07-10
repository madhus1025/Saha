import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RoleToggle } from '../RoleToggle'

describe('RoleToggle', () => {
  it('offers exactly Wife and Husband', () => {
    render(<RoleToggle onChange={vi.fn()} />)

    const options = screen.getAllByRole('radio')
    expect(options.map((option) => option.textContent)).toEqual(['Wife', 'Husband'])
  })

  it('exposes the selected option to assistive technology', () => {
    render(<RoleToggle value="Husband" onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: 'Husband' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Wife' })).toHaveAttribute('aria-checked', 'false')
  })

  it('selects a role on click', async () => {
    const onChange = vi.fn()
    render(<RoleToggle onChange={onChange} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Wife' }))

    expect(onChange).toHaveBeenCalledWith('Wife')
  })

  it('moves between options with the arrow keys', async () => {
    const onChange = vi.fn()
    render(<RoleToggle value="Wife" onChange={onChange} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Wife' }))
    await userEvent.keyboard('{ArrowRight}')

    expect(onChange).toHaveBeenCalledWith('Husband')
  })

  it('wraps around when arrowing past the last option', async () => {
    const onChange = vi.fn()
    render(<RoleToggle value="Husband" onChange={onChange} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Husband' }))
    await userEvent.keyboard('{ArrowRight}')

    expect(onChange).toHaveBeenCalledWith('Wife')
  })

  it('surfaces an error without using red as the signal', () => {
    render(<RoleToggle onChange={vi.fn()} error="Choose one." />)

    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Choose one.')
    expect(error.className).not.toMatch(/red/)
  })
})
