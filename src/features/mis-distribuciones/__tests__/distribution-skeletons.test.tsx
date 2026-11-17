import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
	DistributionCardsSkeleton,
	DistributionReceiptSkeleton,
} from '../components/distribution-skeletons'

describe('DistributionCardsSkeleton', () => {
	it('renders a labelled grid of placeholder cards', () => {
		render(<DistributionCardsSkeleton cards={4} />)
		expect(
			screen.getByRole('status', { name: 'Cargando distribuciones' })
		).toBeInTheDocument()
		expect(screen.getAllByTestId('distribution-card-skeleton')).toHaveLength(4)
	})
})

describe('DistributionReceiptSkeleton', () => {
	it('renders a labelled receipt placeholder with summary and detail rows', () => {
		render(<DistributionReceiptSkeleton />)
		expect(screen.getByRole('status', { name: 'Cargando recibo' })).toBeInTheDocument()
		expect(screen.getAllByTestId('receipt-row-skeleton').length).toBeGreaterThan(0)
	})
})
