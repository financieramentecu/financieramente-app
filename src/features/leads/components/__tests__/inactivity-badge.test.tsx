import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InactivityBadge } from '@/features/leads/components/inactivity-badge'

describe('InactivityBadge', () => {
	it('renders the idle days', () => {
		render(<InactivityBadge days={10} />)
		expect(screen.getByText('Sin actividad · 10 días')).toBeInTheDocument()
	})
	it('renders nothing when the lead is not stale', () => {
		const { container } = render(<InactivityBadge days={null} />)
		expect(container).toBeEmptyDOMElement()
	})
})
