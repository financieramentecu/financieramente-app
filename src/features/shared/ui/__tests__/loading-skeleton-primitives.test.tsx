import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
	SkeletonRegion,
	ListRowsSkeleton,
	CardGridSkeleton,
	FormSkeleton,
} from '../loading-skeletons'

describe('SkeletonRegion', () => {
	it('announces a busy status region with its Spanish label', () => {
		render(
			<SkeletonRegion label="Cargando roles">
				<div>child</div>
			</SkeletonRegion>
		)
		const region = screen.getByRole('status', { name: 'Cargando roles' })
		expect(region).toHaveAttribute('aria-busy', 'true')
		expect(screen.getByText('child')).toBeInTheDocument()
	})
})

describe('ListRowsSkeleton', () => {
	it('renders the requested number of rows inside a labelled region', () => {
		render(<ListRowsSkeleton label="Cargando lista" rows={4} />)
		expect(screen.getByRole('status', { name: 'Cargando lista' })).toBeInTheDocument()
		expect(screen.getAllByTestId('skeleton-row')).toHaveLength(4)
	})

	it('defaults to 5 rows', () => {
		render(<ListRowsSkeleton label="Cargando" />)
		expect(screen.getAllByTestId('skeleton-row')).toHaveLength(5)
	})
})

describe('CardGridSkeleton', () => {
	it('renders the requested number of cards', () => {
		render(<CardGridSkeleton label="Cargando módulos" cards={6} />)
		expect(screen.getByRole('status', { name: 'Cargando módulos' })).toBeInTheDocument()
		expect(screen.getAllByTestId('skeleton-card')).toHaveLength(6)
	})
})

describe('FormSkeleton', () => {
	it('renders one placeholder per field plus the action row', () => {
		render(<FormSkeleton label="Cargando formulario" fields={3} />)
		expect(screen.getByRole('status', { name: 'Cargando formulario' })).toBeInTheDocument()
		expect(screen.getAllByTestId('skeleton-field')).toHaveLength(3)
	})
})
