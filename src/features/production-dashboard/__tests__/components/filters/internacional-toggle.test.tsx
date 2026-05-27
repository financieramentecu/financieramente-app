import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InternacionalToggle } from '../../../components/filters/InternacionalToggle'

describe('InternacionalToggle', () => {
  it('renders with Internacional label', () => {
    render(<InternacionalToggle checked={false} onChange={vi.fn()} />)
    expect(screen.getByText('Internacional')).toBeInTheDocument()
  })

  it('renders switch in unchecked state when checked=false', () => {
    render(<InternacionalToggle checked={false} onChange={vi.fn()} />)
    const switchEl = screen.getByRole('switch')
    expect(switchEl).toHaveAttribute('aria-checked', 'false')
  })

  it('renders switch in checked state when checked=true', () => {
    render(<InternacionalToggle checked={true} onChange={vi.fn()} />)
    const switchEl = screen.getByRole('switch')
    expect(switchEl).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with toggled value on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<InternacionalToggle checked={false} onChange={onChange} />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
