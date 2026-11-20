/** Visible name of a lead. Falls back to the id when both name parts are empty. */
export function leadDisplayName(lead: {
	idLead: number
	name: string | null
	lastName: string | null
}): string {
	const name = [lead.name, lead.lastName].filter(Boolean).join(' ').trim()
	return name || `Lead #${lead.idLead}`
}
