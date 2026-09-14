import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { importLeadsFromCsv } from '@/features/leads/services/lead-csv-import.service'
import type { LeadCsvRawRow } from '@/features/leads/lib/parse-lead-csv-file'
import type { LeadCsvImportSummary } from '@/features/leads/types/lead-csv-import.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.ASISTENTE_GERENCIA_OPERATIVA]

const csvImportBodySchema = z.object({
	rows: z.array(z.record(z.string(), z.string())),
})

/**
 * POST /api/leads/csv-import — synchronous CSV import (ADMIN +
 * ASISTENTE_GERENCIA_OPERATIVA only). Rows arrive as JSON, already
 * client-side parsed by `parseLeadCsvFile`; this route re-validates
 * everything server-side via `importLeadsFromCsv`. Row-level tolerance:
 * always `200` with a summary, even when every row is rejected — only
 * auth, malformed body, or headers mismatch (checked upstream) return
 * non-2xx.
 */
export async function POST(request: Request) {
	const session = await auth()
	if (!session?.user?.email) {
		const errorResponse: ApiResponse<null> = { data: null, error: 'No autorizado' }
		return NextResponse.json(errorResponse, { status: 401 })
	}

	const currentUser = await getCurrentUserByEmail(session.user.email)
	const userRole = currentUser?.role?.code as UserRole
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'No tiene permisos para importar leads',
		}
		return NextResponse.json(errorResponse, { status: 403 })
	}

	try {
		const body = await request.json()
		const { rows } = csvImportBodySchema.parse(body)

		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const summary: LeadCsvImportSummary = await importLeadsFromCsv(
			rows as LeadCsvRawRow[],
			{
				userId,
				email: session.user.email,
				ipAddress: getClientIp(request.headers),
				userAgent: getUserAgent(request.headers),
			}
		)

		const response: ApiResponse<LeadCsvImportSummary> = { data: summary }
		return NextResponse.json(response, { status: 200 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: error.issues[0]?.message || 'Cuerpo de la solicitud inválido',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		console.error('Error processing leads CSV import:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al importar los leads',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
