import type { DocumentType } from '@prisma/client'
import { isDocumentDataTypeCode } from '@/features/document-types/lib/document-data-type'
import type {
	DocumentTypeDto,
	DocumentTypeOption,
} from '@/features/document-types/types/document-type.types'

export function toDocumentTypeDto(row: DocumentType): DocumentTypeDto {
	if (!isDocumentDataTypeCode(row.dataType)) {
		throw new Error(`Tipo de dato no soportado: ${row.dataType}`)
	}

	return {
		idDocumentType: row.idDocumentType,
		name: row.name,
		code: row.code,
		dataType: row.dataType,
		minLength: row.minLength,
		maxLength: row.maxLength,
		status: row.status,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	}
}

export function toDocumentTypeOption(dto: DocumentTypeDto): DocumentTypeOption {
	return {
		code: dto.code,
		name: dto.name,
		dataType: dto.dataType,
		minLength: dto.minLength,
		maxLength: dto.maxLength,
		status: dto.status,
	}
}
