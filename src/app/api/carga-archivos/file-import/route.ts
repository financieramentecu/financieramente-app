import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const body = await request.json()
		const { fileName } = body

		if (!fileName) {
			return NextResponse.json(
				{ error: 'Se requiere el nombre del archivo' },
				{ status: 400 }
			)
		}

		// Crear FileImport
		const fileImport = await prisma.fileImport.create({
			data: {
				nameFile: fileName,
				idUser: Number(session.user.id),
				totalRecord: 0,
				successRecord: 0,
				errorRecord: 0,
				status: 'PROCESANDO',
			},
		})

		return NextResponse.json({ fileImport }, { status: 201 })
	} catch (error) {
		console.error('Error al crear FileImport:', error)
		return NextResponse.json(
			{ status: 500 }
		)
	}
}

export async function GET() {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const fileImports = await prisma.fileImport.findMany({
			where: {
				idUser: Number(session.user.id),
			},
			orderBy: {
				createdAt: 'desc',
			},
			include: {
				user: {
					select: {
						name: true,
						lastName: true,
					},
				},
			},
		})

		return NextResponse.json(fileImports)
	} catch (error) {
		console.error('Error al obtener historial:', error)
		return NextResponse.json(
			{
				error: 'Error al obtener historial',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}

