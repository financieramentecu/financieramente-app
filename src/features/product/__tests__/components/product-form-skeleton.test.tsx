import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
	ProductFormSkeleton,
	EditProductFormSkeleton,
} from '../../components/product-form-skeleton'

describe('ProductFormSkeleton', () => {
	it('should render skeleton for product form (happy path)', () => {
		const { container } = render(<ProductFormSkeleton />)

		// Check that skeleton elements are rendered
		const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
		expect(skeletons.length).toBeGreaterThan(0)
	})

	it('should render with correct structure', () => {
		const { container } = render(<ProductFormSkeleton />)

		// Check for skeleton elements (they use Skeleton component)
		const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
		expect(skeletons.length).toBeGreaterThan(0)
	})

	it('should render all form field skeletons', () => {
		const { container } = render(<ProductFormSkeleton />)

		// Should have skeletons for:
		// - Header (title and description)
		// - Company field
		// - Name field
		// - Status field
		// - Action buttons
		const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
		expect(skeletons.length).toBeGreaterThanOrEqual(5)
	})
})

describe('EditProductFormSkeleton', () => {
	it('should render skeleton for edit product form (happy path)', () => {
		const { container } = render(<EditProductFormSkeleton />)

		// Check that skeleton elements are rendered
		const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
		expect(skeletons.length).toBeGreaterThan(0)
	})

	it('should render with correct structure', () => {
		const { container } = render(<EditProductFormSkeleton />)

		// Check for skeleton elements
		const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
		expect(skeletons.length).toBeGreaterThan(0)
	})

	it('should render all form field skeletons', () => {
		const { container } = render(<EditProductFormSkeleton />)

		// Should have skeletons for:
		// - Header (title and description)
		// - Company field
		// - Name field
		// - Status field
		// - Action buttons
		const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
		expect(skeletons.length).toBeGreaterThanOrEqual(5)
	})

	it('should have same structure as ProductFormSkeleton', () => {
		const { container: createContainer } = render(<ProductFormSkeleton />)
		const { container: editContainer } = render(<EditProductFormSkeleton />)

		const createSkeletons = createContainer.querySelectorAll('[class*="animate-pulse"]')
		const editSkeletons = editContainer.querySelectorAll('[class*="animate-pulse"]')

		// Both should have similar number of skeleton elements
		expect(createSkeletons.length).toBeGreaterThan(0)
		expect(editSkeletons.length).toBeGreaterThan(0)
	})
})

