import type { LeadTableQuery } from '@/features/leads/table/lead-table-query.schema'

export type SavedLeadTableQuery = Omit<LeadTableQuery, 'page' | 'pageSize'>

export interface LeadSavedView {
	idLeadSavedView: number
	name: string
	query: SavedLeadTableQuery
}
