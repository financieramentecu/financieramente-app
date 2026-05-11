import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProductConfigurationCreateClient } from '../../components/product-configuration-create-client'
import { createMockProductConfiguration } from '../fixtures/mock-product-configuration'

const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: mockPush,
		replace: mockReplace,
		prefetch: vi.fn(),
	}),
}))

const mockCreate = vi.fn()

vi.mock('../../hooks/use-product-configuration-mutations', () => ({
	useProductConfigurationMutations: () => ({
		createState: {
			status: 'idle' as const,
			data: undefined,
			error: '',
		},
		updateState: {
			status: 'idle' as const,
			data: undefined,
			error: '',
		},
		toggleActiveState: {
			status: 'idle' as const,
			data: undefined,
			error: '',
		},
		createProductConfiguration: mockCreate,
		updateProductConfiguration: vi.fn(),
		toggleActive: vi.fn(),
	}),
}))

vi.mock('../../components/product-configuration-form', () => ({
	ProductConfigurationForm: ({
		onSubmit,
	}: {
		onSubmit: (data: Record<string, unknown>) => void | Promise<void>
	}) => {
		React.useEffect(() => {
			void onSubmit({
				idProduct: 1,
				idClientOrigin: 1,
				idLevel: 1,
				idCompany: 1,
			})
		}, [onSubmit])
		return <div data-testid="mock-form" />
	},
}))

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}))

describe('ProductConfigurationCreateClient', () => {
	beforeEach(() => {
		mockPush.mockClear()
		mockReplace.mockClear()
		mockCreate.mockReset()
	})

	it('navigates to distribution step two (crear regla) after successful create', async () => {
		mockCreate.mockResolvedValue(
			createMockProductConfiguration({ code: 'A-B-C' })
		)

		render(<ProductConfigurationCreateClient />)

		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith(
				'/dashboard/config-distribucion-comisiones/A-B-C/reglas/crear'
			)
		})
	})
})
