import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BusinessStatusBadge } from '../BusinessStatusBadge'

describe('BusinessStatusBadge', () => {
	it('renders CARTERA badge with amber label', () => {
		render(<BusinessStatusBadge status="CARTERA" />)
		expect(screen.getByText('Cartera')).toBeInTheDocument()
	})

	it('renders CARTERA badge with amber CSS classes', () => {
		const { container } = render(<BusinessStatusBadge status="CARTERA" />)
		const badge = container.firstChild as HTMLElement
		// The className should contain amber
		expect(badge?.className).toContain('amber')
	})

	it('renders other statuses without regression', () => {
		render(<BusinessStatusBadge status="FONDEADO" />)
		expect(screen.getByText('Fondeado')).toBeInTheDocument()
	})
})
