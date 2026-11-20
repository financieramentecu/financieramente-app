import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { toLeadTableSearchParams, type LeadTableQuery } from '@/features/leads/table/lead-table-query.schema'
import type { LeadTablePage, LeadTagChip } from '@/features/leads/table/lead-table.types'
import type { LeadStageOption } from '@/features/leads/table/lead-stage-options.service'

async function readData<T>(response: Response, fallback: string): Promise<T> {
	const body = (await response.json().catch(() => null)) as ApiResponse<T> | null
	if (!response.ok || !body || ('error' in body && body.error)) {
		throw new Error(body && 'error' in body && body.error ? body.error : fallback)
	}
	return body.data as T
}

export async function fetchLeadTable(query: LeadTableQuery): Promise<LeadTablePage> {
	const params = toLeadTableSearchParams(query).toString()
	return readData(await fetch(`/api/crm/leads${params ? `?${params}` : ''}`), 'No fue posible cargar los leads.')
}

/** Download URL for the CSV export of the current filters (no paging). */
export function buildLeadExportUrl(query: LeadTableQuery): string {
	const params = toLeadTableSearchParams({ ...query, page: 1 }).toString()
	return `/api/crm/leads/export${params ? `?${params}` : ''}`
}

export async function fetchStageOptions(): Promise<LeadStageOption[]> {
	return readData(await fetch('/api/crm/stages'), 'No fue posible cargar las etapas.')
}

export async function fetchTagOptions(): Promise<LeadTagChip[]> {
	return readData(await fetch('/api/crm/tags'), 'No fue posible cargar las etiquetas.')
}

export { readData as readApiData }
