import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MultiSelect } from '../multi-select'

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
]

describe('MultiSelect', () => {
  it('renders the trigger button with placeholder', () => {
    render(
      <MultiSelect
        options={options}
        value={[]}
        onChange={vi.fn()}
        placeholder="Select options"
      />
    )
    expect(screen.getByText('Select options')).toBeInTheDocument()
  })

  it('shows selected count when values are selected', () => {
    render(
      <MultiSelect
        options={options}
        value={['a', 'b']}
        onChange={vi.fn()}
        placeholder="Select options"
      />
    )
    // Should indicate selected count (e.g. "2 seleccionados" or similar)
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('opens dropdown when trigger is clicked', () => {
    render(
      <MultiSelect
        options={options}
        value={[]}
        onChange={vi.fn()}
        placeholder="Select options"
      />
    )
    fireEvent.click(screen.getByRole('combobox'))
    // Options should be visible after opening
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
    expect(screen.getByText('Option C')).toBeInTheDocument()
  })

  it('calls onChange with added value when option is selected', () => {
    const onChange = vi.fn()
    render(
      <MultiSelect
        options={options}
        value={[]}
        onChange={onChange}
        placeholder="Select options"
      />
    )
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('Option A'))
    expect(onChange).toHaveBeenCalledWith(['a'])
  })

  it('calls onChange with removed value when already-selected option is clicked', () => {
    const onChange = vi.fn()
    render(
      <MultiSelect
        options={options}
        value={['a', 'b']}
        onChange={onChange}
        placeholder="Select options"
      />
    )
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('Option A'))
    expect(onChange).toHaveBeenCalledWith(['b'])
  })

  it('filters options based on search input', () => {
    render(
      <MultiSelect
        options={options}
        value={[]}
        onChange={vi.fn()}
        placeholder="Select options"
      />
    )
    fireEvent.click(screen.getByRole('combobox'))
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(searchInput, { target: { value: 'Option A' } })
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.queryByText('Option B')).not.toBeInTheDocument()
  })
})
