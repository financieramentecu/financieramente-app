import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBusinessForm } from '@/features/negocios/hooks/use-business-form'
import { UserRole } from '@/features/auth/lib/roles'
import { createMockUserWithRole } from '@/features/shared/__tests__/fixtures/mockUserWithRole'

// ---------- module mocks ----------

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
		results: [],
	}),
}))

vi.mock('@/features/negocios/hooks/use-search-agents', () => ({
	useSearchAgents: () => ({
		handleSearchAgents: vi.fn(),
		results: [],
		search: '',
		setSearch: vi.fn(),
		state: { status: 'idle', data: undefined, error: '' },
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

// ---------- helpers ----------

const baseOptions = {
	companiesOptions: [{ value: '1', label: 'Co' }],
	productsOptions: [{ value: '1', label: 'Pr', companyId: '1' }],
	periodicitiesOptions: [{ value: '1', label: 'Mo' }],
	currenciesOptions: [{ value: '1', label: 'COP' }],
	clientOriginsOptions: [{ value: '1', label: 'Or' }],
}

// ---------- tests ----------

describe('isBlocked — lógica de bloqueo según rol', () => {
	it('ADMIN → isBlocked = false aunque documentValue esté vacío', () => {
		const adminUser = createMockUserWithRole(UserRole.ADMIN)

		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { identityNumber: '' },
				currentUser: adminUser,
				...baseOptions,
			})
		)

		expect(result.current.isBlocked).toBe(false)
	})

	it('ASISTENTE_GERENCIA_OPERATIVA → isBlocked = false aunque documentValue esté vacío', () => {
		const agoUser = createMockUserWithRole(UserRole.ASISTENTE_GERENCIA_OPERATIVA)

		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { identityNumber: '' },
				currentUser: agoUser,
				...baseOptions,
			})
		)

		expect(result.current.isBlocked).toBe(false)
	})

	it('AGENTE → isBlocked = true cuando documentValue tiene menos de 5 caracteres', () => {
		const agenteUser = createMockUserWithRole(UserRole.AGENTE)

		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { identityNumber: '123' }, // menos de 5 chars
				currentUser: agenteUser,
				...baseOptions,
			})
		)

		expect(result.current.isBlocked).toBe(true)
	})

	it('AGENTE → isBlocked = false cuando documentValue tiene 5+ caracteres', () => {
		const agenteUser = createMockUserWithRole(UserRole.AGENTE)

		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { identityNumber: '12345' }, // exactamente 5 chars
				currentUser: agenteUser,
				...baseOptions,
			})
		)

		expect(result.current.isBlocked).toBe(false)
	})

	it('ANALISTA_SOPORTE → isBlocked = true cuando documentValue está vacío', () => {
		const analistaUser = createMockUserWithRole(UserRole.ANALISTA_SOPORTE)

		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { identityNumber: '' },
				currentUser: analistaUser,
				...baseOptions,
			})
		)

		expect(result.current.isBlocked).toBe(true)
	})
})
