/**
 * Import summary DTOs per design (`Interfaces / Contracts`). `rowNumber` is
 * the 1-based spreadsheet line (header = 1, first data row = 2).
 */
export interface LeadCsvRejectedRow {
	rowNumber: number
	externalCrmId?: string
	reason: string
}

/**
 * Discriminates why a row's `Lead` ended up without an assigned owner, per
 * design Amendment A's owner resolution order (email first, name fallback).
 */
export type LeadCsvOwnerlessReason =
	| 'EMAIL_UNMATCHED' // correo presente sin match, sin nombre suministrado
	| 'NAME_UNMATCHED' // nombre suministrado, cero coincidencias
	| 'NAME_AMBIGUOUS' // nombre suministrado, N > 1 coincidencias
	| 'NO_OWNER_PROVIDED' // ambas columnas vacías y el lead queda sin dueño

export interface LeadCsvOwnerlessLead {
	rowNumber: number
	externalCrmId: string
	reason: LeadCsvOwnerlessReason
	ownerEmail?: string
	ownerName?: string
	candidateCount?: number
}

export interface LeadCsvWonLockedLead {
	rowNumber: number
	externalCrmId: string
	attemptedStatus: string
}

export interface LeadCsvImportSummary {
	totalRows: number
	imported: number
	created: number
	updated: number
	rejected: LeadCsvRejectedRow[]
	ownerlessLeads: LeadCsvOwnerlessLead[]
	wonLockedLeads: LeadCsvWonLockedLead[]
}
