import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/features/shared/hooks/use-auth-session', () => ({
	useAuthSession: vi.fn(),
}))

vi.mock('@/features/report-permissions/lib/report-permissions-api', () => ({
	fetchMyAuthorizedReports: vi.fn(),
}))

import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { fetchMyAuthorizedReports } from '@/features/report-permissions/lib/report-permissions-api'
import { useAuthorizedReportCodes } from '@/features/report-permissions/hooks/use-authorized-report-codes'

describe('useAuthorizedReportCodes', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('always exposes PRODUCCION_REAL for ADMIN even before the API resolves', () => {
		vi.mocked(useAuthSession).mockReturnValue({
			session: { user: { role: UserRole.ADMIN } },
		} as never)
		vi.mocked(fetchMyAuthorizedReports).mockReturnValue(new Promise(() => {}))

		const { result } = renderHook(() => useAuthorizedReportCodes())
		expect(result.current.codes).toEqual(['PRODUCCION_REAL'])
	})

	it('keeps PRODUCCION_REAL for ADMIN when the API returns an empty catalog', async () => {
		vi.mocked(useAuthSession).mockReturnValue({
			session: { user: { role: UserRole.ADMIN } },
		} as never)
		vi.mocked(fetchMyAuthorizedReports).mockResolvedValue({ codes: [] })

		const { result } = renderHook(() => useAuthorizedReportCodes())
		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})
		expect(result.current.codes).toEqual(['PRODUCCION_REAL'])
	})

	it('does not invent codes for non-admin when the API is empty', async () => {
		vi.mocked(useAuthSession).mockReturnValue({
			session: { user: { role: UserRole.AGENTE } },
		} as never)
		vi.mocked(fetchMyAuthorizedReports).mockResolvedValue({ codes: [] })

		const { result } = renderHook(() => useAuthorizedReportCodes())
		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})
		expect(result.current.codes).toEqual([])
	})
})
