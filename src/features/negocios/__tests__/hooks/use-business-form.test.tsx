import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBusinessForm } from '@/features/negocios/hooks/use-business-form'
import {
	mockUserWithRole,
	createMockUserWithRole,
} from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import { UserRole } from '@/features/auth/lib/roles'
import { createClient } from '@/features/negocios/actions/create-client'
import { updateClient } from '@/features/negocios/actions/update-client'
import { createBusiness } from '@/features/negocios/actions/create-business'
import { resolveExistingClient } from '@/features/negocios/actions/resolve-existing-client'

vi.mock('@/features/negocios/actions/create-client', () => ({
	createClient: vi.fn(),
}))

vi.mock('@/features/negocios/actions/update-client', () => ({
	updateClient: vi.fn(),
}))

vi.mock('@/features/negocios/actions/create-business', () => ({
	createBusiness: vi.fn(),
}))

vi.mock('@/features/negocios/actions/resolve-existing-client', () => ({
	resolveExistingClient: vi.fn(),
}))

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

	describe('isBlocked matrix (D3)', () => {
		it('is false when leadId is present, regardless of document length', () => {
			const { result } = renderHook(() =>
				useBusinessForm({
					mode: 'create',
					defaultValues: { ...baseDefaults, identityNumber: '' },
					currentUser: mockUserWithRole,
					leadId: 99,
					...options,
				})
			)

			expect(result.current.isBlocked).toBe(false)
		})

		it('is false for a privileged role, regardless of document length', () => {
			const { result } = renderHook(() =>
				useBusinessForm({
					mode: 'create',
					defaultValues: { ...baseDefaults, identityNumber: '' },
					currentUser: createMockUserWithRole(UserRole.ADMIN),
					...options,
				})
			)

			expect(result.current.isBlocked).toBe(false)
		})

		it('is false in edit mode, regardless of document length', () => {
			const { result } = renderHook(() =>
				useBusinessForm({
					mode: 'edit',
					businessId: 42,
					defaultValues: { ...baseDefaults, identityNumber: '' },
					currentUser: mockUserWithRole,
					...options,
				})
			)

			expect(result.current.isBlocked).toBe(false)
		})

		it('is true in manual create mode for a non-privileged role with document < 5 chars', () => {
			const { result } = renderHook(() =>
				useBusinessForm({
					mode: 'create',
					defaultValues: { ...baseDefaults, identityNumber: '123' },
					currentUser: mockUserWithRole,
					...options,
				})
			)

			expect(result.current.isBlocked).toBe(true)
		})

		it('is false in manual create mode for a non-privileged role with document >= 5 chars', () => {
			const { result } = renderHook(() =>
				useBusinessForm({
					mode: 'create',
					defaultValues: { ...baseDefaults, identityNumber: '12345' },
					currentUser: mockUserWithRole,
					...options,
				})
			)

			expect(result.current.isBlocked).toBe(false)
		})
	})

	describe('isContractBlocked matrix (D4)', () => {
		it('is false when leadId is present', () => {
			const { result } = renderHook(() =>
				useBusinessForm({
					mode: 'create',
					defaultValues: { ...baseDefaults, identityNumber: '' },
					currentUser: mockUserWithRole,
					leadId: 99,
					...options,
				})
			)

			expect(result.current.isContractBlocked).toBe(false)
		})

		it('is false in edit mode', () => {
			const { result } = renderHook(() =>
				useBusinessForm({
					mode: 'edit',
					businessId: 42,
					defaultValues: { ...baseDefaults, identityNumber: '' },
					currentUser: mockUserWithRole,
					...options,
				})
			)

			expect(result.current.isContractBlocked).toBe(false)
		})

		it('is true in manual create mode with document < 5 chars, even for a privileged role', () => {
			const { result } = renderHook(() =>
				useBusinessForm({
					mode: 'create',
					defaultValues: { ...baseDefaults, identityNumber: '123' },
					currentUser: createMockUserWithRole(UserRole.ADMIN),
					...options,
				})
			)

			expect(result.current.isContractBlocked).toBe(true)
		})

		it('is false in manual create mode with document >= 5 chars', () => {
			const { result } = renderHook(() =>
				useBusinessForm({
					mode: 'create',
					defaultValues: { ...baseDefaults, identityNumber: '12345' },
					currentUser: mockUserWithRole,
					...options,
				})
			)

			expect(result.current.isContractBlocked).toBe(false)
		})
	})
})

const resolvedClient = {
	idClient: 42,
	name: 'Juan',
	lastName: 'Pérez',
	typeIdentity: 'CC',
	identityNumber: '12345678',
	email: 'client@test.com',
	phone: '3001234567',
	direcction: null,
	city: null,
	country: 'Colombia',
	active: true,
	createdAt: new Date(),
	updatedAt: new Date(),
}

const createdClient = { ...resolvedClient, idClient: 99 }

async function submit(result: {
	current: ReturnType<typeof useBusinessForm>
}) {
	await act(async () => {
		await result.current.handleFormSubmit()
	})
}

describe('useBusinessForm — client resolution submit flow (D2/D5/D6/D7)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(createBusiness).mockResolvedValue({
			data: { idBusiness: 1 },
		} as never)
	})

	it('D2: does not call resolveExistingClient when leadId is absent (manual create)', async () => {
		vi.mocked(createClient).mockResolvedValue({ data: createdClient } as never)

		const onSubmit = vi.fn()
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				onSubmit,
				...options,
			})
		)

		await submit(result)

		expect(resolveExistingClient).not.toHaveBeenCalled()
		expect(createClient).toHaveBeenCalled()
		expect(onSubmit).toHaveBeenCalled()
	})

	it('D6: falls through to createClient when resolution returns an error', async () => {
		vi.mocked(resolveExistingClient).mockResolvedValue({
			data: null,
			error: 'boom',
		} as never)
		vi.mocked(createClient).mockResolvedValue({ data: createdClient } as never)

		const onSubmit = vi.fn()
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				leadId: 7,
				onSubmit,
				...options,
			})
		)

		await submit(result)

		expect(resolveExistingClient).toHaveBeenCalled()
		expect(createClient).toHaveBeenCalled()
		expect(onSubmit).toHaveBeenCalled()
	})

	it('D6: falls through to createClient when resolution finds no match', async () => {
		vi.mocked(resolveExistingClient).mockResolvedValue({
			data: null,
		} as never)
		vi.mocked(createClient).mockResolvedValue({ data: createdClient } as never)

		const onSubmit = vi.fn()
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				leadId: 7,
				onSubmit,
				...options,
			})
		)

		await submit(result)

		expect(createClient).toHaveBeenCalled()
		expect(onSubmit).toHaveBeenCalled()
	})

	it('routes a "document" resolution straight through without raising identityConflict', async () => {
		vi.mocked(resolveExistingClient).mockResolvedValue({
			data: { client: resolvedClient, source: 'document' },
		} as never)

		const onSubmit = vi.fn()
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				leadId: 7,
				onSubmit,
				...options,
			})
		)

		await submit(result)

		expect(createClient).not.toHaveBeenCalled()
		expect(result.current.identityConflict).toBeNull()
		expect(createBusiness).toHaveBeenCalledWith(
			expect.objectContaining({ idClient: resolvedClient.idClient })
		)
		expect(onSubmit).toHaveBeenCalled()
	})

	it('routes a "reactivated" resolution straight through without raising identityConflict', async () => {
		vi.mocked(resolveExistingClient).mockResolvedValue({
			data: { client: resolvedClient, source: 'reactivated' },
		} as never)

		const onSubmit = vi.fn()
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				leadId: 7,
				onSubmit,
				...options,
			})
		)

		await submit(result)

		expect(result.current.identityConflict).toBeNull()
		expect(onSubmit).toHaveBeenCalled()
	})

	it('an "email" match with the SAME identityNumber never raises identityConflict', async () => {
		vi.mocked(resolveExistingClient).mockResolvedValue({
			data: {
				client: { ...resolvedClient, identityNumber: baseDefaults.identityNumber },
				source: 'email',
			},
		} as never)

		const onSubmit = vi.fn()
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				leadId: 7,
				onSubmit,
				...options,
			})
		)

		await submit(result)

		expect(result.current.identityConflict).toBeNull()
		expect(onSubmit).toHaveBeenCalled()
	})

	it('D5: an "email" match with a DIFFERENT identityNumber raises identityConflict and stops the submit', async () => {
		vi.mocked(resolveExistingClient).mockResolvedValue({
			data: {
				client: { ...resolvedClient, identityNumber: '99999999' },
				source: 'email',
			},
		} as never)

		const onSubmit = vi.fn()
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				leadId: 7,
				onSubmit,
				...options,
			})
		)

		await submit(result)

		expect(result.current.identityConflict).toEqual(
			expect.objectContaining({
				storedIdentityNumber: '99999999',
				typedIdentityNumber: baseDefaults.identityNumber,
			})
		)
		expect(createBusiness).not.toHaveBeenCalled()
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('D5 resume "keep": resolveIdentityConflict("keep") completes the submit without updating identityNumber', async () => {
		vi.mocked(resolveExistingClient).mockResolvedValue({
			data: {
				client: { ...resolvedClient, identityNumber: '99999999' },
				source: 'email',
			},
		} as never)

		const onSubmit = vi.fn()
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				leadId: 7,
				onSubmit,
				...options,
			})
		)

		await submit(result)
		expect(result.current.identityConflict).not.toBeNull()

		await act(async () => {
			await result.current.resolveIdentityConflict('keep')
		})

		expect(updateClient).not.toHaveBeenCalled()
		expect(onSubmit).toHaveBeenCalled()
		expect(result.current.identityConflict).toBeNull()
	})

	it('D5 resume "update": resolveIdentityConflict("update") calls updateClient WITH identityNumber then completes the submit', async () => {
		vi.mocked(resolveExistingClient).mockResolvedValue({
			data: {
				client: { ...resolvedClient, identityNumber: '99999999' },
				source: 'email',
			},
		} as never)
		vi.mocked(updateClient).mockResolvedValue({
			data: { ...resolvedClient, identityNumber: baseDefaults.identityNumber },
		} as never)

		const onSubmit = vi.fn()
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				leadId: 7,
				onSubmit,
				...options,
			})
		)

		await submit(result)

		await act(async () => {
			await result.current.resolveIdentityConflict('update')
		})

		expect(updateClient).toHaveBeenCalledWith(
			expect.objectContaining({ identityNumber: baseDefaults.identityNumber })
		)
		expect(onSubmit).toHaveBeenCalled()
		expect(result.current.identityConflict).toBeNull()
	})

	it('D5 resume "update" server rejection: surfaces the error on identityConflict.error and does not create the business', async () => {
		vi.mocked(resolveExistingClient).mockResolvedValue({
			data: {
				client: { ...resolvedClient, identityNumber: '99999999' },
				source: 'email',
			},
		} as never)
		vi.mocked(updateClient).mockResolvedValue({
			data: null,
			error: 'No tienes permisos para editar la información del cliente',
		} as never)

		const onSubmit = vi.fn()
		const { result } = renderHook(() =>
			useBusinessForm({
				mode: 'create',
				defaultValues: { ...baseDefaults },
				currentUser: mockUserWithRole,
				leadId: 7,
				onSubmit,
				...options,
			})
		)

		await submit(result)

		await act(async () => {
			await result.current.resolveIdentityConflict('update')
		})

		expect(result.current.identityConflict).toEqual(
			expect.objectContaining({
				error: 'No tienes permisos para editar la información del cliente',
			})
		)
		expect(onSubmit).not.toHaveBeenCalled()
		expect(createBusiness).not.toHaveBeenCalled()
	})
})
