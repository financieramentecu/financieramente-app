import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PercentageField } from '@/features/shared/ui/percentage-field'

describe('PercentageField', () => {
	it('shows empty when value is undefined', () => {
		const onChange = vi.fn()
		render(<PercentageField value={undefined} onChange={onChange} />)
		const input = screen.getByRole('textbox')
		expect(input).toHaveValue('')
	})

	it('normalizes paste and calls onChange', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		render(<PercentageField value={undefined} onChange={onChange} />)
		const input = screen.getByRole('textbox')
		await user.click(input)
		await user.paste('12,5 %')
		expect(onChange).toHaveBeenCalled()
		const last = onChange.mock.calls.at(-1)?.[0]
		expect(last).toBeCloseTo(12.5, 4)
	})

	it('commits undefined on blur when cleared', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		render(<PercentageField value={10} onChange={onChange} />)
		const input = screen.getByRole('textbox')
		await user.clear(input)
		await user.tab()
		expect(onChange).toHaveBeenCalledWith(undefined)
	})

	it('keeps digits in the textbox value and hides the % adornment from the a11y tree', () => {
		const onChange = vi.fn()
		render(
			<PercentageField value={12.5} onChange={onChange} locale="es-CO" />
		)
		const input = screen.getByRole('textbox') as HTMLInputElement
		expect(input.value).not.toContain('%')
		expect(input.value).toMatch(/12[,.]5/)
		const adornments = document.querySelectorAll('[aria-hidden="true"]')
		expect([...adornments].some((el) => el.textContent === '%')).toBe(true)
	})
})
