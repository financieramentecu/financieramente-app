import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SingleSelectFilter } from '../../../components/filters/SingleSelectFilter'

const options = [
  { value: '__todas__', label: 'Todos' },
  { value: 'EMITIDO', label: 'Emitido' },
  { value: 'VIGENTE', label: 'Vigente' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

describe('SingleSelectFilter', () => {
  it('renders with the placeholder label', () => {
    render(
      <SingleSelectFilter
        options={options}
        value="__todas__"
        onChange={vi.fn()}
        placeholder="Estado"
      />
    )
    expect(screen.getByText('Estado')).toBeInTheDocument()
  })

  it('renders with the current value label when value is set', () => {
    render(
      <SingleSelectFilter
        options={options}
        value="EMITIDO"
        onChange={vi.fn()}
        placeholder="Estado"
      />
    )
    expect(screen.getByText('Emitido')).toBeInTheDocument()
  })

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SingleSelectFilter
        options={options}
        value="__todas__"
        onChange={onChange}
        placeholder="Estado"
      />
    )
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Vigente' }))
    expect(onChange).toHaveBeenCalledWith('VIGENTE')
  })
})
