import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBusinesses } from '../../hooks/use-businesses'
import { businessService } from '../../services/business.service'
import type { BusinessEntity } from '../../types/business-entity.types'

vi.mock('../../services/business.service', () => ({
	businessService: {
		getAll: vi.fn(),
	},
}))

function makeBusiness(id: number): BusinessEntity {
	return { id } as unknown as BusinessEntity
}

function makePagination(total: number) {
	return { page: 1, pageSize: 10, total, totalPages: 1 }
}

describe('useBusinesses', () => {
	const mockGetAll = vi.mocked(businessService.getAll)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('discards a slower, older response that resolves after a newer one (out-of-order race)', async () => {
		// First render: unfiltered params, resolves SLOW.
		let resolveFirst!: (value: Awaited<ReturnType<typeof businessService.getAll>>) => void
		const firstResponsePromise = new Promise<
			Awaited<ReturnType<typeof businessService.getAll>>
		>((resolve) => {
			resolveFirst = resolve
		})

		mockGetAll.mockReturnValueOnce(firstResponsePromise)

		const { result, rerender } = renderHook(
			({ params }: { params: Parameters<typeof useBusinesses>[0] }) =>
				useBusinesses(params),
			{
				initialProps: {
					params: { page: 1 } as Parameters<typeof useBusinesses>[0],
				},
			}
		)

		// Second render: filtered params, resolves FAST (before the first one).
		const secondResponse = {
			data: {
				businesses: [makeBusiness(999)],
				pagination: makePagination(1),
			},
		}
		mockGetAll.mockResolvedValueOnce(secondResponse)

		rerender({ params: { page: 1, search: 'filtro' } })

		await waitFor(() => {
			expect(result.current.businesses).toEqual([{ id: 999 }])
		})

		// Now the FIRST (older, unfiltered) request finally resolves — it must
		// NOT overwrite the newer, filtered result already applied.
		resolveFirst({
			data: {
				businesses: [makeBusiness(1), makeBusiness(2), makeBusiness(3)],
				pagination: makePagination(3),
			},
		})

		// Give the stale promise a tick to (incorrectly) apply state if unguarded.
		await new Promise((r) => setTimeout(r, 0))

		expect(result.current.businesses).toEqual([{ id: 999 }])
	})
})
