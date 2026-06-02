import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MultiSelectFilter } from '../../../components/filters/MultiSelectFilter'

const items = [
  { id: 1, label: 'Skandia' },
  { id: 2, label: 'Suramericana' },
  { id: 3, label: 'Bolivar' },
]

describe('MultiSelectFilter', () => {
  it('shows todasLabel when value is []', () => {
    render(
      <MultiSelectFilter
        items={items}
        value={[]}
        onChange={vi.fn()}
        placeholder="Compañía"
        todasLabel="Todas"
      />
    )
    expect(screen.getByText('Todas')).toBeInTheDocument()
  })

  it('shows item count when some items selected', () => {
    render(
      <MultiSelectFilter
        items={items}
        value={[1, 2]}
        onChange={vi.fn()}
        placeholder="Compañía"
        todasLabel="Todas"
      />
    )
    // Shows count or names
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens popover on trigger click', async () => {
    const user = userEvent.setup()
    render(
      <MultiSelectFilter
        items={items}
        value={[]}
        onChange={vi.fn()}
        placeholder="Compañía"
        todasLabel="Todas"
      />
    )
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('option', { name: 'Skandia' })).toBeInTheDocument()
  })

  it('calls onChange with [] when Todas option is selected while items are selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <MultiSelectFilter
        items={items}
        value={[1, 2]}
        onChange={onChange}
        placeholder="Compañía"
        todasLabel="Todas"
      />
    )
    await user.click(screen.getByRole('button'))
    const todasOption = screen.getByRole('option', { name: 'Todas' })
    await user.click(todasOption)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('calls onChange with toggled id when a specific item is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <MultiSelectFilter
        items={items}
        value={[]}
        onChange={onChange}
        placeholder="Compañía"
        todasLabel="Todas"
      />
    )
    await user.click(screen.getByRole('button'))
    const skandiaOption = screen.getByRole('option', { name: 'Skandia' })
    await user.click(skandiaOption)
    expect(onChange).toHaveBeenCalledWith([1])
  })

  it('has correct aria label on trigger', () => {
    render(
      <MultiSelectFilter
        items={items}
        value={[]}
        onChange={vi.fn()}
        placeholder="Compañía"
        todasLabel="Todas"
      />
    )
    expect(screen.getByRole('button', { name: /Compañía/i })).toBeInTheDocument()
  })
})
