import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'

import { deleteFileImport } from '@/features/load-file/services/delete-file-import.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { FileImport } from '@prisma/client'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' } satisfies ApiResponse<null>,
				{ status: 401 }
			)
		}

		const { id } = await params
		const fileImportId = parseInt(id, 10)

		if (isNaN(fileImportId)) {
			return NextResponse.json(
				{ data: null, error: 'ID inválido' } satisfies ApiResponse<null>,
				{ status: 400 }
			)
		}

		// Obtener FileImport
		const fileImport = await prisma.fileImport.findFirst({
			where: {
				idFileImport: fileImportId,
				idUser: Number(session.user.id),
			},
		})

		if (!fileImport) {
			return NextResponse.json(
				{
					data: null,
					error: 'FileImport no encontrado o no autorizado',
				} satisfies ApiResponse<null>,
				{ status: 404 }
			)
		}

		return NextResponse.json(
			{ data: fileImport } satisfies ApiResponse<FileImport>,
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error al obtener FileImport:', error)
		return NextResponse.json(
			{
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener FileImport',
			} satisfies ApiResponse<null>,
			{ status: 500 }
		)
	}
}

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' } satisfies ApiResponse<null>,
				{ status: 401 }
			)
		}

		const { id } = await params
		const fileImportId = parseInt(id, 10)

		if (isNaN(fileImportId)) {
			return NextResponse.json(
				{ data: null, error: 'ID inválido' } satisfies ApiResponse<null>,
				{ status: 400 }
			)
		}

		const result = await deleteFileImport(
			fileImportId,
			Number(session.user.id)
		)

		if (result.ok) {
			return NextResponse.json(
				{ data: { success: true } } satisfies ApiResponse<{ success: boolean }>,
				{ status: 200 }
			)
		}

		if (result.code === 'NOT_FOUND') {
			return NextResponse.json(
				{ data: null, error: result.message } satisfies ApiResponse<null>,
				{ status: 404 }
			)
		}

		return NextResponse.json(
			{ data: null, error: result.message } satisfies ApiResponse<null>,
			{ status: 409 }
		)
	} catch (error) {
		console.error('Error al eliminar FileImport:', error)
		if (error instanceof Error && error.message === 'NOT_FOUND') {
			return NextResponse.json(
				{
					data: null,
					error: 'FileImport no encontrado o no autorizado',
				} satisfies ApiResponse<null>,
				{ status: 404 }
			)
		}
		return NextResponse.json(
			{
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar FileImport',
			} satisfies ApiResponse<null>,
			{ status: 500 }
		)
	}
}
