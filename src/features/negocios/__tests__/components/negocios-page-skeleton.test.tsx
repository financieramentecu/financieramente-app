import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NegociosPageSkeleton } from '../../components/NegociosPageSkeleton'

describe('NegociosPageSkeleton', () => {
	it('announces a busy loading region to assistive technology', () => {
		render(<NegociosPageSkeleton />)

		const region = screen.getByRole('status', { name: 'Cargando negocios' })
		expect(region).toHaveAttribute('aria-busy', 'true')
	})

	it('renders placeholders for the KPI cards and the table', () => {
		render(<NegociosPageSkeleton />)

		expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(20)
	})
})
