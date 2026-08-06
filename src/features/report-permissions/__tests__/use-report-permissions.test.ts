import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { REPORT_PERMISSIONS_UI } from '@/features/report-permissions/lib/report-permissions-helpers'

vi.mock('sonner', () => ({
	toast: {
		warning: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
	},
}))

vi.mock('@/features/report-permissions/lib/report-permissions-api', () => ({
	fetchReportPermissionsCatalog: vi.fn(),
	saveReportPermissions: vi.fn(),
}))

import {
	fetchReportPermissionsCatalog,
	saveReportPermissions,
} from '@/features/report-permissions/lib/report-permissions-api'
import { useReportPermissions } from '@/features/report-permissions/hooks/use-report-permissions'

const catalog = {
	reports: [
		{
			id: 1,
			code: 'PRODUCCION_REAL',
			name: 'Producción Real',
			description: null,
			routePath: '/dashboard/reportes/produccion-real',
			status: true,
		},
	],
	matrix: {
		report: {
			id: 1,
			code: 'PRODUCCION_REAL',
			name: 'Producción Real',
			description: null,
			routePath: '/dashboard/reportes/produccion-real',
			status: true,
		},
		categories: [
			{ idCategory: 1, name: 'MS Junior', enabled: true },
			{ idCategory: 4, name: 'Performance Leader', enabled: true },
		],
	},
}

describe('useReportPermissions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(fetchReportPermissionsCatalog).mockResolvedValue(catalog)
	})

	it('loads matrix and supports Todas cascade on selections', async () => {
		const { result } = renderHook(() => useReportPermissions())

		await waitFor(() => {
			expect(result.current.catalogState.status).toBe('success')
		})

		expect(result.current.selectedCategoryIds).toEqual([1, 4])
		expect(result.current.todasChecked).toBe(true)

		act(() => {
			result.current.handleToggleTodas(false)
		})
		expect(result.current.selectedCategoryIds).toEqual([])
		expect(result.current.todasChecked).toBe(false)

		act(() => {
			result.current.handleToggleTodas(true)
		})
		expect(result.current.selectedCategoryIds).toEqual([1, 4])
		expect(result.current.todasChecked).toBe(true)
	})

	it('blocks empty save with Spanish warning toast', async () => {
		const { result } = renderHook(() => useReportPermissions())

		await waitFor(() => {
			expect(result.current.catalogState.status).toBe('success')
		})

		act(() => {
			result.current.handleToggleTodas(false)
		})

		let saved = true
		await act(async () => {
			saved = await result.current.handleSave()
		})

		expect(saved).toBe(false)
		expect(toast.warning).toHaveBeenCalledWith(
			REPORT_PERMISSIONS_UI.SAVE_WARNING
		)
		expect(saveReportPermissions).not.toHaveBeenCalled()
	})

	it('saves and shows success toast when categories selected', async () => {
		vi.mocked(saveReportPermissions).mockResolvedValue({
			...catalog.matrix,
			categories: [
				{ idCategory: 1, name: 'MS Junior', enabled: false },
				{ idCategory: 4, name: 'Performance Leader', enabled: true },
			],
		})

		const { result } = renderHook(() => useReportPermissions())

		await waitFor(() => {
			expect(result.current.catalogState.status).toBe('success')
		})

		act(() => {
			result.current.handleToggleCategory(1)
		})

		await act(async () => {
			await result.current.handleSave()
		})

		expect(saveReportPermissions).toHaveBeenCalledWith('PRODUCCION_REAL', [4])
		expect(toast.success).toHaveBeenCalledWith(
			REPORT_PERMISSIONS_UI.SAVE_SUCCESS
		)
	})
})
