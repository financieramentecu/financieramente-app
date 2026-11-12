import { readApiData } from '@/features/leads/table/lead-table-api'
import type { LeadSavedView, SavedLeadTableQuery } from '@/features/leads/views/lead-saved-view.types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function fetchSavedViews(): Promise<LeadSavedView[]> {
	return readApiData(await fetch('/api/crm/views'), 'No fue posible cargar tus vistas.')
}

export async function createSavedView(name: string, query: SavedLeadTableQuery): Promise<LeadSavedView> {
	const response = await fetch('/api/crm/views', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name, query }) })
	return readApiData(response, 'No fue posible guardar la vista.')
}

export async function deleteSavedView(idLeadSavedView: number): Promise<void> {
	const response = await fetch(`/api/crm/views/${idLeadSavedView}`, { method: 'DELETE' })
	if (!response.ok) throw new Error('No fue posible eliminar la vista.')
}
