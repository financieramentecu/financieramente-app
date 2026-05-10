import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
	LevelFormSkeleton,
	EditLevelFormSkeleton,
} from '../../components/level-form-skeleton'

describe('LevelFormSkeleton', () => {
	it('should render skeleton structure matching form layout', () => {
		render(<LevelFormSkeleton />)

		const container = document.querySelector('.max-w-2xl')
		expect(container).toBeInTheDocument()
	})

	it('should match form spacing with space-y-6 class', () => {
		render(<LevelFormSkeleton />)

		const spacedContainers = document.querySelectorAll('.space-y-6')
		expect(spacedContainers.length).toBeGreaterThan(0)
	})

	it('should have field skeleton groups (space-y-2)', () => {
		render(<LevelFormSkeleton />)

		const fieldGroups = document.querySelectorAll('.space-y-2')
		expect(fieldGroups.length).toBeGreaterThan(0)
	})
})

describe('EditLevelFormSkeleton', () => {
	it('should render skeleton structure matching form layout', () => {
		render(<EditLevelFormSkeleton />)

		const container = document.querySelector('.max-w-2xl')
		expect(container).toBeInTheDocument()
	})

	it('should match form spacing and layout', () => {
		render(<EditLevelFormSkeleton />)

		const spacedContainers = document.querySelectorAll('.space-y-6')
		expect(spacedContainers.length).toBeGreaterThan(0)

		const fieldGroups = document.querySelectorAll('.space-y-2')
		expect(fieldGroups.length).toBeGreaterThan(0)
	})

	it('should have action buttons skeleton', () => {
		render(<EditLevelFormSkeleton />)

		const actionContainer = document.querySelector('.flex.justify-end.gap-3')
		expect(actionContainer).toBeInTheDocument()
	})
})
