import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/features/auth/lib/roles'
import { FILE_TYPES, type FileType } from '@/features/load-file/lib/file-types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	FileImportHistory,
	PaginatedData,
} from '@/features/load-file/types/load-file.types'

export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const body = await request.json()
		const { fileName, fileType } = body

		if (!fileName) {
			return NextResponse.json(
				{ error: 'Se requiere el nombre del archivo' },
				{ status: 400 }
			)
		}

		const isValidFileType =
			typeof fileType === 'string' &&
			Object.values(FILE_TYPES).includes(fileType as FileType)

		if (!isValidFileType) {
			return NextResponse.json(
				{ error: 'Se requiere un tipo de archivo válido' },
				{ status: 400 }
			)
		}

		const userId = Number(session.user.id)
		const userExists = await prisma.user.findUnique({
			where: { idUser: userId },
			select: { idUser: true },
		})

		if (!userExists) {
			return NextResponse.json(
				{ error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		// Crear FileImport
		const fileImport = await prisma.fileImport.create({
			data: {
				nameFile: fileName,
				fileType,
				idUser: userId,
				totalRecord: 0,
				successRecord: 0,
				errorRecord: 0,
				status: 'PROCESSING',
			},
		})

		return NextResponse.json({ data: { fileImport } }, { status: 201 })
	} catch (error) {
		console.error('Error al crear FileImport:', error)
		return NextResponse.json({ status: 500 })
	}
}

export async function GET() {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const isAdmin = session.user.role === UserRole.ADMIN
		const fileImports = await prisma.fileImport.findMany({
			where: isAdmin
				? undefined
				: { idUser: Number(session.user.id) },
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

		return NextResponse.json(
			{
				data: {
					items: fileImports as unknown as FileImportHistory[],
					pagination: {
						page: 1,
						pageSize: fileImports.length,
						totalItems: fileImports.length,
						totalPages: 1,
					},
				},
			} satisfies ApiResponse<PaginatedData<FileImportHistory>>,
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error al obtener historial:', error)
		return NextResponse.json(
			{
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener historial',
			} satisfies ApiResponse<null>,
			{ status: 500 }
		)
	}
}
