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

export interface PaginatedData<T> {
	items: T[]
	pagination: {
		page: number
		pageSize: number
		totalItems: number
		totalPages: number
	}
}
