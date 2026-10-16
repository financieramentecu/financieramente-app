import type { DocumentDataTypeCode } from '@/features/document-types/lib/document-data-type'

export interface DocumentTypeDto {
	idDocumentType: number
	name: string
	code: string
	dataType: DocumentDataTypeCode
	minLength: number
	maxLength: number
	status: boolean
	createdAt: string
	updatedAt: string
}

export interface DocumentTypeOption {
	code: string
	name: string
	dataType: DocumentDataTypeCode
	minLength: number
	maxLength: number
	status: boolean
}

export interface CreateDocumentTypeInput {
	name: string
	code: string
	dataType: DocumentDataTypeCode
	minLength: number
	maxLength: number
	status: boolean
}

export interface UpdateDocumentTypeInput {
	name?: string
	code?: string
	dataType?: DocumentDataTypeCode
	minLength?: number
	maxLength?: number
	status?: boolean
}
