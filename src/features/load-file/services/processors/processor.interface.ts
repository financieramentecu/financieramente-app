import type { ProcessedRecord } from '../../types/load-file.types'

export interface ProcessorResult {
	status: 'SYNCHRONIZED' | 'LAG' | 'ERROR'
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
		auditContext: ProcessorAuditContext
	): Promise<ProcessorResult>
}
