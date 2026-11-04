import type { ProcessedRecord } from '../../types/load-file.types'

export interface ProcessorResult {
	/**
	 * `EXCLUDED`: the business belongs to a PARTNER_EXTERNAL configuration. The row is
	 * stored for traceability but never takes part in pre-liquidation (PL-01).
	 */
	status: 'SYNCHRONIZED' | 'LAG' | 'ERROR' | 'EXCLUDED'
	isLag: boolean
	idBusiness: number | null
	recoveredLag: boolean
	errorReason?: string
	resolvedErrors: number
}

export interface ProcessorAuditContext {
	userId: number
	email?: string
	ipAddress?: string
	userAgent?: string
	fileImportId: number
}

export interface ICommissionProcessor {
	process(
		record: ProcessedRecord,
		headers: string[],
		fileImportId: number,
		snapshots: {
			discountPercentage: number | string
			clawbackPercentage: number | string | null
		},
		auditContext: ProcessorAuditContext,
		loadNumber: number,
		expectedMonth?: number,
		expectedYear?: number
	): Promise<ProcessorResult>
}
