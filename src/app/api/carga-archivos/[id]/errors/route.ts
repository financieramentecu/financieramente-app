import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

export const dynamic = 'force-dynamic'

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const { id } = await params
		const fileImportId = parseInt(id, 10)

		if (isNaN(fileImportId)) {
			return NextResponse.json(
				{ data: null, error: 'ID de importación inválido' },
				{ status: 400 }
			)
		}

		// Verify the file import exists and belongs to the user
		const fileImport = await prisma.fileImport.findFirst({
			where: { idFileImport: fileImportId, idUser: parseInt(session.user.id) },
		})

		if (!fileImport) {
			return NextResponse.json(
				{ data: null, error: 'Importación no encontrada o no autorizada' },
				{ status: 404 }
			)
		}

		const { searchParams } = new URL(request.url)
		const loadNumberParam = searchParams.get('loadNumber')
		const loadNumber = loadNumberParam ? parseInt(loadNumberParam, 10) : undefined

		const where: Prisma.FileImportErrorWhereInput = { idFileImport: fileImportId }
		if (loadNumber !== undefined) {
			where.loadNumber = loadNumber
		}

		const errors = await prisma.fileImportError.findMany({
			where,
			orderBy: { rowNumber: 'asc' },
		})

		return NextResponse.json({ data: errors })
	} catch (error) {
		console.error('Error fetching file import errors:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Ocurrió un error al obtener los errores de la importación',
			},
			{ status: 500 }
		)
	}
}
