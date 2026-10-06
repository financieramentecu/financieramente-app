import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { buildLeadCsvTemplate } from '@/features/leads/lib/lead-csv-template'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.ASISTENTE_GERENCIA_OPERATIVA]

/**
 * GET /api/leads/csv-template — downloadable header-only CSV template for
 * the leads import (ADMIN + ASISTENTE_GERENCIA_OPERATIVA only).
 */
export async function GET() {
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
			error: 'No tiene permisos para descargar la plantilla de importación',
		}
		return NextResponse.json(errorResponse, { status: 403 })
	}

	return new NextResponse(buildLeadCsvTemplate(), {
		status: 200,
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="plantilla-leads.csv"',
		},
	})
}
