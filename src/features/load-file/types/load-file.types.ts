import { FileType } from '../lib/file-types'

export interface ProcessedRecord {
	rowNumber: number
	data: Record<string, unknown>
	isValid: boolean
	errors: string[]
}

export interface ProcessBatchRequest {
	fileImportId: number
	records: ProcessedRecord[]
	headers: string[]
	fileType: FileType
	batchSize?: number
}

export interface ProcessResult {
	successCount: number
	errorCount: number
	sincronizadoCount: number
	rezagadoCount: number
	validRecords: ProcessedRecord[]
	errorRecords: ProcessedRecord[]
	headers: string[]
	uploadCount?: number
}

export interface ProcessBatchSummary {
	total: number
	sincronizado: number
	rezagado: number
	noSincronizado: number
	error: number
}

export interface ProcessBatchResponse {
	summary: ProcessBatchSummary
}

export interface FileImportHistory {
	idFileImport: number
	nameFile: string
	fileType: string
	totalRecord: number
	successRecord: number
	errorRecord: number
	sincronizadoRecord: number
	rezagadoRecord: number
	noSincronizadoRecord: number
	status: string
	createdAt: Date
	month?: number
	year?: number
	uploadCount: number
	user: {
		name: string | null
		lastName: string | null
	}
}

export interface PaginatedData<T> {
	items: T[]
	pagination: {
		page: number
		pageSize: number
		totalItems: number
		totalPages: number
	}
}

/** Status filter for file import records: Sincronizados, No sincronizados, Rezagados */
export type FileImportRecordStatusFilter =
	| 'SYNCHRONIZED'
	| 'NO_SYNC'
	| 'REZAGADOS'

/** Single record in the records-by-status detail (table row) */
export interface FileImportRecordDetail {
	idSettlementCommission: number
	contract: string | null
	baseCommission: number | null
	commissionValue: number | null
	isLag: boolean
	isClawback: boolean
	discountPercentage: number | null
	clawbackPercentage: number | null
	startDate: Date | null
	endDate: Date | null
	/** For No sincronizados only: "No existe el contrato" or "La fecha de creación no está en el rango de fechas" */
	detail?: string
}

export interface FileImportRecordsResponse {
	items: FileImportRecordDetail[]
	pagination: {
		page: number
		pageSize: number
		totalItems: number
		totalPages: number
	}
}

/** Result of deleteFileImport service: success or typed error for API mapping */
export type DeleteFileImportResult =
	| { ok: true }
	| { ok: false; code: 'NOT_FOUND'; message: string }
	| { ok: false; code: 'INVALID_STATUS'; message: string }
