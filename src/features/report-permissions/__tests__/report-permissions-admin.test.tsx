import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { REPORT_PERMISSIONS_UI } from '@/features/report-permissions/lib/report-permissions-helpers'

const mockHandleToggleTodas = vi.fn()
const mockHandleToggleCategory = vi.fn()
const mockHandleSave = vi.fn()
const mockSelectReport = vi.fn()

vi.mock('@/features/report-permissions/hooks/use-report-permissions', () => ({
	useReportPermissions: vi.fn(),
}))

import { useReportPermissions } from '@/features/report-permissions/hooks/use-report-permissions'
import { ReportPermissionsAdmin } from '@/features/report-permissions/components/report-permissions-admin'

const mockUseReportPermissions = vi.mocked(useReportPermissions)

const catalogSuccess = {
	status: 'success' as const,
	data: {
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
				{ idCategory: 1, name: 'MS Junior', enabled: false },
				{ idCategory: 4, name: 'Performance Leader', enabled: true },
			],
		},
	},
	error: '',
}

function mockHook(overrides: Record<string, unknown> = {}) {
	mockUseReportPermissions.mockReturnValue({
		catalogState: catalogSuccess,
		selectedCode: 'PRODUCCION_REAL',
		selectedCategoryIds: [4],
		isSaving: false,
		todasChecked: false,
		selectReport: mockSelectReport,
		handleToggleTodas: mockHandleToggleTodas,
		handleToggleCategory: mockHandleToggleCategory,
		handleSave: mockHandleSave,
		refresh: vi.fn(),
		...overrides,
	} as never)
}

describe('ReportPermissionsAdmin', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders category matrix and Todas control', () => {
		mockHook()
		render(<ReportPermissionsAdmin />)

		expect(screen.getByText(REPORT_PERMISSIONS_UI.TODAS)).toBeInTheDocument()
		expect(screen.getByText('MS Junior')).toBeInTheDocument()
		expect(screen.getByText('Performance Leader')).toBeInTheDocument()
		expect(screen.getByText(REPORT_PERMISSIONS_UI.SAVE)).toBeInTheDocument()
	})

	it('shows empty-state copy when no categories selected', () => {
		mockHook({ selectedCategoryIds: [] })
		render(<ReportPermissionsAdmin />)

		expect(
			screen.getByText(REPORT_PERMISSIONS_UI.EMPTY_STATE)
		).toBeInTheDocument()
	})

	it('invokes Todas cascade handler when Todas is toggled', async () => {
		const user = userEvent.setup()
		mockHook()
		render(<ReportPermissionsAdmin />)

		await user.click(screen.getByLabelText(REPORT_PERMISSIONS_UI.TODAS))
		expect(mockHandleToggleTodas).toHaveBeenCalled()
	})

	it('calls save handler when Guardar is clicked', async () => {
		const user = userEvent.setup()
		mockHook()
		render(<ReportPermissionsAdmin />)

		await user.click(screen.getByText(REPORT_PERMISSIONS_UI.SAVE))
		await waitFor(() => {
			expect(mockHandleSave).toHaveBeenCalled()
		})
	})
})
