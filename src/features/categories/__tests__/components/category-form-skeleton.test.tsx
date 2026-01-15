import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
	CategoryFormSkeleton,
	EditCategoryFormSkeleton,
} from '../../components/category-form-skeleton'

describe('CategoryFormSkeleton', () => {
	it('should render skeleton structure matching form layout', () => {
		render(<CategoryFormSkeleton />)

		// Should have container with max-w-2xl
		const container = document.querySelector('.max-w-2xl')
		expect(container).toBeInTheDocument()
	})

	it('should match form spacing with space-y-6 class', () => {
		render(<CategoryFormSkeleton />)

		const spacedContainers = document.querySelectorAll('.space-y-6')
		expect(spacedContainers.length).toBeGreaterThan(0)
	})

	it('should have field skeleton groups (space-y-2)', () => {
		render(<CategoryFormSkeleton />)

		const fieldGroups = document.querySelectorAll('.space-y-2')
		expect(fieldGroups.length).toBeGreaterThan(0)
	})
})

describe('EditCategoryFormSkeleton', () => {
	it('should render skeleton structure matching form layout', () => {
		render(<EditCategoryFormSkeleton />)

		// Should have container with max-w-2xl
		const container = document.querySelector('.max-w-2xl')
		expect(container).toBeInTheDocument()
	})

	it('should match form spacing and layout', () => {
		render(<EditCategoryFormSkeleton />)

		const spacedContainers = document.querySelectorAll('.space-y-6')
		expect(spacedContainers.length).toBeGreaterThan(0)

		// Should have field skeleton groups (space-y-2)
		const fieldGroups = document.querySelectorAll('.space-y-2')
		expect(fieldGroups.length).toBeGreaterThan(0)
	})

	it('should have action buttons skeleton', () => {
		render(<EditCategoryFormSkeleton />)

		// Should have button container with flex and gap
		const actionContainer = document.querySelector('.flex.justify-end.gap-3')
		expect(actionContainer).toBeInTheDocument()
	})
})
