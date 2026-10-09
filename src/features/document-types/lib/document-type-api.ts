import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	CreateDocumentTypeInput,
	DocumentTypeDto,
	UpdateDocumentTypeInput,
} from '@/features/document-types/types/document-type.types'

export const documentTypeApi = {
	async list(): Promise<DocumentTypeDto[]> {
		const response = await apiClient.get<ApiResponse<DocumentTypeDto[]>>(
			'/admin/document-types'
		)
		return response.data ?? []
	},

	async create(input: CreateDocumentTypeInput): Promise<DocumentTypeDto> {
		const response = await apiClient.post<ApiResponse<DocumentTypeDto>>(
			'/admin/document-types',
			input
		)
		if (!response.data) {
			throw new Error('No se pudo crear el tipo de documento')
		}
		return response.data
	},

	async update(
		id: number,
		input: UpdateDocumentTypeInput
	): Promise<DocumentTypeDto> {
		const response = await apiClient.put<ApiResponse<DocumentTypeDto>>(
			`/admin/document-types/${id}`,
			input
		)
		if (!response.data) {
			throw new Error('No se pudo actualizar el tipo de documento')
		}
		return response.data
	},
}
