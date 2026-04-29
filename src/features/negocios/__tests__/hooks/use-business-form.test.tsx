import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBusinessForm } from '@/features/negocios/hooks/use-business-form'
import { mockUserWithRole } from '@/features/shared/__tests__/fixtures/mockUserWithRole'

vi.mock('@/features/negocios/hooks/use-business-mutation', () => ({
	useBusinessMutation: () => ({
		updateBusiness: vi.fn(),
		isUpdating: false,
		cancelBusiness: vi.fn(),
		isCancelling: false,
	}),
}))

vi.mock('@/features/negocios/hooks/use-search-client', () => ({
	useSearchClient: () => ({
		handleSearchClient: vi.fn(),
		clientResults: [],
	}),
}))

vi.mock('@/features/negocios/hooks/use-search-agents', () => ({
	useSearchAgents: () => ({
		handleSearchAgents: vi.fn(),
	}),
}))

vi.mock('@/features/negocios/hooks/use-product-filter', () => ({
	useProductFilter: () => ({
		filteredProducts: [],
	}),
}))

vi.mock('@/features/negocios/hooks/use-agent-permissions', () => ({
	useAgentPermissions: () => ({
		agentsList: [],
		setAgentsList: vi.fn(),
		isAgentUser: false,
		canSearchAgents: false,
	}),
}))

const options = {
	companiesOptions: [{ value: '1', label: 'Co' }],
	productsOptions: [{ value: '1', label: 'Pr', companyId: '1' }],
	periodicitiesOptions: [{ value: '1', label: 'Mo' }],
	currenciesOptions: [{ value: '1', label: 'COP' }],
	clientOriginsOptions: [{ value: '1', label: 'Or' }],
}

const baseDefaults = {
	email: 'client@test.com',
	name: 'Juan',
	lastNames: 'Pérez',
	phone: '3001234567',
	identityNumber: '12345678',
	clientOrigin: '1',
	company: '1',
	producto: '1',
	terms: 12 as const,
	currency: '1',
	periodicity: '1',
	value: 1000,
	agent: '1',
}

describe('useBusinessForm', () => {
	it('initializes contract from defaultValues in edit mode when stored', () => {
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'edit',
				businessId: 42,
				defaultValues: { ...baseDefaults, contract: '9876543210' },
				currentUser: mockUserWithRole,
				...options,
			})
		)

		expect(result.current.form.getValues('contract')).toBe('9876543210')
	})

	it('initializes empty contract in edit mode when defaultValues omit contract', () => {
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'edit',
				businessId: 42,
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				...options,
			})
		)

		expect(result.current.form.getValues('contract')).toBe('')
	})

	it('initializes empty contract in create mode when defaultValues omit contract', () => {
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: {},
				currentUser: mockUserWithRole,
				...options,
			})
		)

		expect(result.current.form.getValues('contract')).toBe('')
	})

	it('accepts alphanumeric contract numbers', async () => {
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'edit',
				businessId: 42,
				defaultValues: { ...baseDefaults, contract: 'CONT-123' },
				currentUser: mockUserWithRole,
				...options,
			})
		)

		await result.current.form.trigger('contract')
		expect(result.current.form.formState.errors.contract).toBeUndefined()
	})
})
