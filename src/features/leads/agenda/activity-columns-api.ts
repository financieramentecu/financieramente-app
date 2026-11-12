import { readApiData } from '@/features/leads/table/lead-table-api'
import { isAgendaBucket, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import type { ActivityColumn } from '@/features/leads/agenda/activity-column.types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function fetchActivityColumns(): Promise<ActivityColumn[]> {
	const data = await readApiData<unknown>(
		await fetch('/api/crm/activity-columns', { cache: 'no-store' }),
		'No fue posible cargar las cabeceras.'
	)
	return parseActivityColumns(data)
}

export async function renameActivityColumn(code: AgendaBucket, name: string): Promise<ActivityColumn> {
	const response = await fetch(`/api/crm/activity-columns/${code}`, {
		method: 'PATCH',
		headers: JSON_HEADERS,
		body: JSON.stringify({ name }),
	})
	return readApiData(response, 'No fue posible guardar la cabecera.')
}

/** Ignores payloads that are not column titles, so a shared fetch mock cannot crash the board. */
export function parseActivityColumns(data: unknown): ActivityColumn[] {
	if (!Array.isArray(data)) return []
	return data.flatMap((item) => {
		if (!item || typeof item !== 'object') return []
		const row = item as { code?: unknown; name?: unknown; position?: unknown }
		if (typeof row.code !== 'string' || !isAgendaBucket(row.code) || typeof row.name !== 'string' || !row.name.trim()) return []
		return [{ code: row.code, name: row.name, position: typeof row.position === 'number' ? row.position : 0 }]
	})
}
