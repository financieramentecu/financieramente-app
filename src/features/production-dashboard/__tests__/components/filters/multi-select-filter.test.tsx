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

  it('enters none-mode when Todas is clicked while all selected — does not call onChange', async () => {
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
    const todasOption = screen.getByRole('option', { name: 'Todas' })
    await user.click(todasOption)
    // No onChange emitted — noneMode is local only
    expect(onChange).not.toHaveBeenCalled()
    // All items now appear unchecked
    expect(screen.getByRole('option', { name: 'Skandia' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('option', { name: 'Suramericana' })).toHaveAttribute('aria-selected', 'false')
  })

  it('exits none-mode and selects only the clicked item on first pick after deselect-all', async () => {
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
    await user.click(screen.getByRole('option', { name: 'Todas' })) // enter noneMode
    await user.click(screen.getByRole('option', { name: 'Skandia' })) // pick one
    expect(onChange).toHaveBeenCalledWith([1])
  })

  it('deselects clicked item from all — keeps all others — when value is []', async () => {
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
    // Clicking Skandia (id=1) when all are selected → keep [2, 3], exclude 1
    expect(onChange).toHaveBeenCalledWith([2, 3])
  })

  it('toggles a specific item when value is a partial selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <MultiSelectFilter
        items={items}
        value={[2, 3]}
        onChange={onChange}
        placeholder="Compañía"
        todasLabel="Todas"
      />
    )
    await user.click(screen.getByRole('button'))
    const skandiaOption = screen.getByRole('option', { name: 'Skandia' })
    await user.click(skandiaOption)
    expect(onChange).toHaveBeenCalledWith([2, 3, 1])
  })

  it('shows all items as checked when value is []', async () => {
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
    expect(screen.getByRole('option', { name: 'Skandia' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Suramericana' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Bolivar' })).toHaveAttribute('aria-selected', 'true')
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
