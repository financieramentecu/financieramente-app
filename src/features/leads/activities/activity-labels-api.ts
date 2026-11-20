import { readApiData } from '@/features/leads/table/lead-table-api'
import type { ActivityLabel } from '@/features/leads/activities/activity-label.types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function fetchActivityLabels(): Promise<ActivityLabel[]> {
	const data = await readApiData<unknown>(await fetch('/api/crm/activity-labels'), 'No fue posible cargar las etiquetas de actividad.')
	return parseActivityLabels(data)
}

export async function createActivityLabel(input: { name: string; color: string }): Promise<ActivityLabel> {
	const response = await fetch('/api/crm/activity-labels', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(input) })
	return readApiData(response, 'No fue posible crear la etiqueta de actividad.')
}

export async function updateActivityLabel(idLeadActivityLabel: number, input: { name: string; color: string }): Promise<ActivityLabel> {
	const response = await fetch(`/api/crm/activity-labels/${idLeadActivityLabel}`, {
		method: 'PATCH',
		headers: JSON_HEADERS,
		body: JSON.stringify(input),
	})
	return readApiData(response, 'No fue posible guardar la etiqueta de actividad.')
}

export async function deleteActivityLabel(idLeadActivityLabel: number): Promise<void> {
	const response = await fetch(`/api/crm/activity-labels/${idLeadActivityLabel}`, { method: 'DELETE' })
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { error?: string } | null
		throw new Error(body?.error ?? 'No fue posible eliminar la etiqueta de actividad.')
	}
}

/** Ignores payloads that are not the catalogue, so a shared fetch mock cannot crash the form. */
export function parseActivityLabels(data: unknown): ActivityLabel[] {
	if (!Array.isArray(data)) return []
	return data.flatMap((item) => {
		if (!item || typeof item !== 'object') return []
		const row = item as Partial<ActivityLabel>
		if (typeof row.idLeadActivityLabel !== 'number' || typeof row.name !== 'string') return []
		return [{
			idLeadActivityLabel: row.idLeadActivityLabel,
			name: row.name,
			color: typeof row.color === 'string' ? row.color : '#64748b',
			code: typeof row.code === 'string' ? row.code : null,
		}]
	})
}
