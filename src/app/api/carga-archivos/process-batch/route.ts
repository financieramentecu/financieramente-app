import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import { processBatchService } from '@/features/load-file/services/process-batch.service'
import type {
	ProcessBatchRequest,
	ProcessBatchResponse,
} from '@/features/load-file/types/load-file.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' } satisfies ApiResponse<null>,
				{ status: 401 }
			)
		}

		const body: ProcessBatchRequest = await request.json()

		const auditContext = {
			userId: Number(session.user.id),
			email: session.user.email ?? undefined,
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
			fileImportId: body.fileImportId,
		}

		const result = await processBatchService.processBatch(body, auditContext)

		return NextResponse.json(
			{ data: result } satisfies ApiResponse<ProcessBatchResponse>,
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error al procesar archivo:', error)
		return NextResponse.json(
			{
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al procesar archivo',
			} satisfies ApiResponse<null>,
			{
				status:
					error instanceof Error && error.message.includes('inválidos')
						? 400
						: 500,
			}
		)
	}
}
