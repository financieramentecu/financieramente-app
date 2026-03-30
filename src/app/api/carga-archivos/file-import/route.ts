import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import {
	FileImportService,
	PeriodCompletedError,
	PeriodPreSettledError,
} from '@/features/load-file/services/file-import.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	FileImportHistory,
	PaginatedData,
} from '@/features/load-file/types/load-file.types'

// ---------------------------------------------------------------------------
// Zod validation schema for POST body
// ---------------------------------------------------------------------------

const createFileImportSchema = z.object({
	fileType: z.enum(['POLIZA', 'VOLUNTARIA']),
	month: z.number().int().min(1).max(12),
	year: z.number().int().min(2020).max(2100),
})

// ---------------------------------------------------------------------------
// Zod validation schema for GET query params
// ---------------------------------------------------------------------------

const getFileImportQuerySchema = z.object({
	page: z.coerce.number().int().min(1).optional().default(1),
	limit: z.coerce.number().int().min(1).max(200).optional().default(100),
	month: z.coerce.number().int().min(1).max(12).optional(),
	year: z.coerce.number().int().min(2020).max(2100).optional(),
	status: z.string().optional(),
	search: z.string().optional(),
})

// ---------------------------------------------------------------------------
// POST /api/carga-archivos/file-import
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' } satisfies ApiResponse<null>,
				{ status: 401 }
			)
		}

		const body = await request.json()
		const validation = createFileImportSchema.safeParse(body)

		if (!validation.success) {
			return NextResponse.json(
				{
					data: null,
					error: validation.error.message,
				} satisfies ApiResponse<null>,
				{ status: 400 }
			)
		}

		const { fileType, month, year } = validation.data
		const idUser = Number(session.user.id)

		const result = await FileImportService.initiateImport({
			fileType,
			month,
			year,
			idUser,
		})

		if (result.created) {
			return NextResponse.json(
				{ data: { fileImport: result.fileImport } },
				{ status: 201 }
			)
		}

		return NextResponse.json(
			{ data: { fileImport: result.fileImport } },
			{ status: 200 }
		)
	} catch (error) {
		if (
			error instanceof PeriodCompletedError ||
			error instanceof PeriodPreSettledError
		) {
			return NextResponse.json(
				{
					data: null,
					error: error.message,
				} satisfies ApiResponse<null>,
				{ status: 409 }
			)
		}

		console.error('Error al crear FileImport:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error interno del servidor',
			} satisfies ApiResponse<null>,
			{ status: 500 }
		)
	}
}

// ---------------------------------------------------------------------------
// GET /api/carga-archivos/file-import
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' } satisfies ApiResponse<null>,
				{ status: 401 }
			)
		}

		const query = getFileImportQuerySchema.safeParse(
			Object.fromEntries(request.nextUrl.searchParams)
		)

		if (!query.success) {
			return NextResponse.json(
				{
					data: null,
					error: query.error.message,
				} satisfies ApiResponse<null>,
				{ status: 400 }
			)
		}

		const { month, year, status, search } = query.data
		const userId = Number(session.user.id)
		const isAdmin = session.user.role === UserRole.ADMIN

		const statusArray =
			status && status.trim().length > 0
				? status
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean)
				: undefined

		const fileImports = await FileImportService.listFileImports({
			userId,
			isAdmin,
			month,
			year,
			status: statusArray,
			search,
		})

		return NextResponse.json(
			{
				data: {
					items: fileImports,
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
