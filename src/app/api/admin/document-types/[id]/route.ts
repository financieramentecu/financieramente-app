import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import { updateDocumentTypeSchema } from '@/features/document-types/lib/document-type-schemas'
import { requireSystemAdmin } from '@/features/document-types/lib/require-system-admin'
import { updateDocumentType } from '@/features/document-types/services/document-type.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { DocumentTypeDto } from '@/features/document-types/types/document-type.types'

interface RouteContext {
	params: Promise<{ id: string }>
}

export async function PUT(request: Request, context: RouteContext) {
	const guard = await requireSystemAdmin()
	if (!guard.ok) {
		const body: ApiResponse<null> = { data: null, error: guard.error }
		return NextResponse.json(body, { status: guard.status })
	}

	try {
		const { id } = await context.params
		const idDocumentType = parseInt(id, 10)
		if (!Number.isInteger(idDocumentType) || idDocumentType <= 0) {
			const body: ApiResponse<null> = {
				data: null,
				error: 'Identificador inválido',
			}
			return NextResponse.json(body, { status: 400 })
		}

		const json = await request.json()
		const input = updateDocumentTypeSchema.parse(json)
		const result = await updateDocumentType(idDocumentType, input, {
			userId: guard.currentUser.idUser,
			email: guard.session.user.email ?? undefined,
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
		})

		if ('error' in result) {
			const status = result.error.includes('no encontrado')
				? 404
				: result.error.startsWith('Ya existe')
					? 409
					: 400
			const body: ApiResponse<null> = { data: null, error: result.error }
			return NextResponse.json(body, { status })
		}

		revalidateTag('document-types')
		const body: ApiResponse<DocumentTypeDto> = { data: result.documentType }
		return NextResponse.json(body)
	} catch (error) {
		if (error instanceof z.ZodError) {
			const body: ApiResponse<null> = {
				data: null,
				error: error.issues[0]?.message || 'Datos inválidos',
			}
			return NextResponse.json(body, { status: 400 })
		}

		console.error('Error updating document type:', error)
		const body: ApiResponse<null> = {
			data: null,
			error: 'Error al actualizar el tipo de documento',
		}
		return NextResponse.json(body, { status: 500 })
	}
}
