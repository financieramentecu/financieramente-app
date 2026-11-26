import type { LeadBoardColumn } from '@/features/leads/types/lead.types'

/**
 * Moves a lead card into another column. Returns null when the lead or the
 * destination is missing, or when the lead is already in that column.
 */
export function moveLeadOnBoard(
	columns: LeadBoardColumn[],
	idLead: number,
	toColumnId: number
): LeadBoardColumn[] | null {
	const fromColumn = columns.find((column) => column.leads.some((lead) => lead.idLead === idLead))
	const lead = fromColumn?.leads.find((item) => item.idLead === idLead)
	if (!fromColumn || !lead || fromColumn.idLeadFunnelColumn === toColumnId) return null
	if (!columns.some((column) => column.idLeadFunnelColumn === toColumnId)) return null

	return columns.map((column) => {
		if (column.idLeadFunnelColumn === fromColumn.idLeadFunnelColumn) {
			return { ...column, leads: column.leads.filter((item) => item.idLead !== idLead) }
		}
		if (column.idLeadFunnelColumn === toColumnId) {
			return { ...column, leads: [lead, ...column.leads] }
		}
		return column
	})
}

/**
 * Puts the lead back only if it is still in the column this move targeted.
 * A later successful move is left where the user dropped it.
 */
export function restoreLeadIfStillInColumn(
	columns: LeadBoardColumn[],
	idLead: number,
	expectedColumnId: number,
	homeColumnId: number
): LeadBoardColumn[] {
	const current = columns.find((column) => column.leads.some((lead) => lead.idLead === idLead))
	if (!current || current.idLeadFunnelColumn !== expectedColumnId) return columns
	return moveLeadOnBoard(columns, idLead, homeColumnId) ?? columns
}
