import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../select'

describe('Select Component', () => {
	it('renders select with trigger and opens content', async () => {
		render(
			<Select>
				<SelectTrigger>
					<SelectValue placeholder="Select an option" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="option1">Option 1</SelectItem>
					<SelectItem value="option2">Option 2</SelectItem>
				</SelectContent>
			</Select>
		)

		const trigger = screen.getByRole('combobox')
		expect(trigger).toBeInTheDocument()
		expect(screen.getByText('Select an option')).toBeInTheDocument()

		fireEvent.click(trigger)

		await waitFor(() => {
			expect(screen.getByText('Option 1')).toBeInTheDocument()
			expect(screen.getByText('Option 2')).toBeInTheDocument()
		})
	})

	it('applies popper position and max-height to content', async () => {
		render(
			<Select open={true}>
				<SelectTrigger>
					<SelectValue placeholder="Select an option" />
				</SelectTrigger>
				<SelectContent position="popper">
					<SelectItem value="option1">Option 1</SelectItem>
				</SelectContent>
			</Select>
		)

		// SelectContent uses Radix's Portal, so we need to wait for it
		await waitFor(() => {
			expect(screen.getByText('Option 1')).toBeInTheDocument()
		})

		const item = screen.getByText('Option 1')
		// Find the content container
		const content = item.closest('[role="listbox"]') || item.closest('[data-radix-select-content]')
		
		if (!content) {
			screen.debug()
			throw new Error('Could not find SelectContent container')
		}

		expect(content).toHaveClass('max-h-80')
	})

	it('does not have the fixed viewport height class in popper mode', async () => {
		render(
			<Select open={true}>
				<SelectTrigger>
					<SelectValue placeholder="Select an option" />
				</SelectTrigger>
				<SelectContent position="popper">
					<SelectItem value="option1">Option 1</SelectItem>
				</SelectContent>
			</Select>
		)

		await waitFor(() => {
			expect(screen.getByText('Option 1')).toBeInTheDocument()
		})

		const item = screen.getByText('Option 1')
		const viewport = item.closest('[data-radix-select-viewport]')
		
		if (!viewport) {
			throw new Error('Could not find SelectViewport container')
		}

		// The old class h-[var(--radix-select-trigger-height)] should be gone
		expect(viewport.className).not.toContain('h-[var(--radix-select-trigger-height)]')
	})
})
