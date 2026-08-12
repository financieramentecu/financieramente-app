import { apiClient } from '@/lib/api/client'
import type {
	AuthorizedReportsDto,
	ReportPermissionsCatalog,
	ReportPermissionMatrix,
} from '@/features/report-permissions/types/report-permissions.types'

export async function fetchReportPermissionsCatalog(
	code?: string
): Promise<ReportPermissionsCatalog> {
	const query = code ? `?code=${encodeURIComponent(code)}` : ''
	const response = await apiClient.get<{ data: ReportPermissionsCatalog }>(
		`/report-permissions${query}`
	)
	return response.data
}

export async function saveReportPermissions(
	code: string,
	categoryIds: readonly number[]
): Promise<ReportPermissionMatrix> {
	const response = await apiClient.put<{ data: ReportPermissionMatrix }>(
		'/report-permissions',
		{ code, categoryIds }
	)
	return response.data
}

export async function fetchMyAuthorizedReports(): Promise<AuthorizedReportsDto> {
	const response = await apiClient.get<{ data: AuthorizedReportsDto }>(
		'/reports/me'
	)
	return response.data
}
