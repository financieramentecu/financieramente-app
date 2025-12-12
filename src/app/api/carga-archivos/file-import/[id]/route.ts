import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const { id } = await params
		const fileImportId = parseInt(id, 10)

		if (isNaN(fileImportId)) {
			return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
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
				{ error: 'FileImport no encontrado o no autorizado' },
				{ status: 404 }
			)
		}

		return NextResponse.json(fileImport)
	} catch (error) {
		console.error('Error al obtener FileImport:', error)
		return NextResponse.json(
			{
				error: 'Error al obtener FileImport',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}

