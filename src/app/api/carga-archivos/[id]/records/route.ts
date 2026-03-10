import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFileImportRecords } from '@/features/load-file/services/file-import-records.service'
import type { FileImportRecordStatusFilter } from '@/features/load-file/types/load-file.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

export const dynamic = 'force-dynamic'

const VALID_STATUSES: FileImportRecordStatusFilter[] = [
	'SYNCHRONIZED',
	'NO_SYNC',
	'REZAGADOS',
]

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
		if (Number.isNaN(fileImportId)) {
			return NextResponse.json(
				{ data: null, error: 'ID de importación inválido' },
				{ status: 400 }
			)
		}

		const { searchParams } = new URL(request.url)
		const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
		const pageSize = Math.min(
			100,
			Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10) || 20)
		)
		const statusParam = searchParams.get('status')
		const status: FileImportRecordStatusFilter =
			statusParam && VALID_STATUSES.includes(statusParam as FileImportRecordStatusFilter)
				? (statusParam as FileImportRecordStatusFilter)
				: 'SYNCHRONIZED'

		const result = await getFileImportRecords(fileImportId, parseInt(session.user.id, 10), {
			page,
			pageSize,
			status,
		})

		if (result === null) {
			return NextResponse.json(
				{ data: null, error: 'Importación no encontrada o no autorizada' },
				{ status: 404 }
			)
		}

		return NextResponse.json({ data: result })
	} catch (error) {
		console.error('Error fetching file import records:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Ocurrió un error al obtener los registros de la importación',
			},
			{ status: 500 }
		)
	}
}
