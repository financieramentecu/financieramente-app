import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { listActiveDocumentTypeOptions } from '@/features/document-types/services/document-type.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { DocumentTypeOption } from '@/features/document-types/types/document-type.types'

export async function GET() {
	const session = await auth()
	if (!session?.user?.email) {
		const body: ApiResponse<null> = { data: null, error: 'No autorizado' }
		return NextResponse.json(body, { status: 401 })
	}

	try {
		const data = await listActiveDocumentTypeOptions()
		const body: ApiResponse<DocumentTypeOption[]> = { data }
		return NextResponse.json(body)
	} catch (error) {
		console.error('Error listing active document types:', error)
		const body: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener los tipos de documento',
		}
		return NextResponse.json(body, { status: 500 })
	}
}
