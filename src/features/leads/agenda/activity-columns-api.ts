import { readApiData } from '@/features/leads/table/lead-table-api'
import { ACTIVITY_COLUMN_CODE, type ActivityColumn } from '@/features/leads/agenda/activity-column.types'
import { isAgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function fetchActivityColumns(): Promise<ActivityColumn[]> {
	const data = await readApiData<unknown>(
		await fetch('/api/crm/activity-columns', { cache: 'no-store' }),
		'No fue posible cargar las columnas.'
	)
	return parseActivityColumns(data)
}

export async function createActivityColumn(name: string): Promise<ActivityColumn> {
	const response = await fetch('/api/crm/activity-columns', {
		method: 'POST',
		headers: JSON_HEADERS,
		body: JSON.stringify({ name }),
	})
	return readApiData(response, 'No fue posible agregar la columna.')
}

export async function renameActivityColumn(code: string, name: string): Promise<ActivityColumn> {
	const response = await fetch(`/api/crm/activity-columns/${code}`, {
		method: 'PATCH',
		headers: JSON_HEADERS,
		body: JSON.stringify({ name }),
	})
	return readApiData(response, 'No fue posible guardar la columna.')
}

export async function deleteActivityColumn(code: string): Promise<void> {
	const response = await fetch(`/api/crm/activity-columns/${code}`, { method: 'DELETE' })
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { error?: string } | null
		throw new Error(body?.error ?? 'No fue posible eliminar la columna.')
	}
}

/** Ignores payloads that are not column titles, so a shared fetch mock cannot crash the board. */
export function parseActivityColumns(data: unknown): ActivityColumn[] {
	if (!Array.isArray(data)) return []
	return data.flatMap((item) => {
		if (!item || typeof item !== 'object') return []
		const row = item as { code?: unknown; name?: unknown; position?: unknown }
		if (typeof row.code !== 'string' || !ACTIVITY_COLUMN_CODE.test(row.code)) return []
		if (typeof row.name !== 'string' || !row.name.trim()) return []
		return [{
			code: row.code,
			name: row.name.trim(),
			position: typeof row.position === 'number' ? row.position : 0,
			system: isAgendaBucket(row.code),
		}]
	})
}
