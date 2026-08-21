import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/features/auth/lib/roles'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { createLeadFunnelColumn } from '@/features/leads/services/lead-funnel-column.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadFunnelColumn } from '@prisma/client'

const createColumnSchema = z.object({
	name: z.string().min(1, 'El nombre es obligatorio').max(120),
	externalStatusKey: z.string().min(1, 'externalStatusKey es obligatorio').max(150),
	position: z.number().int().min(0).default(0),
})

/**
 * GET /api/leads/funnel-columns — list all active columns (admin only).
 * POST /api/leads/funnel-columns — create a column (admin only).
 */
export async function GET() {
	const session = await auth()
	if (!session?.user?.email) {
		const errorResponse: ApiResponse<null> = { data: null, error: 'No autorizado' }
		return NextResponse.json(errorResponse, { status: 401 })
	}

	const currentUser = await getCurrentUserByEmail(session.user.email)
	if (currentUser?.role?.code !== UserRole.ADMIN) {
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Solo administradores pueden acceder a esta sección',
		}
		return NextResponse.json(errorResponse, { status: 403 })
	}

	const columns = await prisma.leadFunnelColumn.findMany({
		where: { active: true },
		orderBy: { position: 'asc' },
	})

	const response: ApiResponse<LeadFunnelColumn[]> = { data: columns }
	return NextResponse.json(response)
}

export async function POST(request: Request) {
	const session = await auth()
	if (!session?.user?.email) {
		const errorResponse: ApiResponse<null> = { data: null, error: 'No autorizado' }
		return NextResponse.json(errorResponse, { status: 401 })
	}

	const currentUser = await getCurrentUserByEmail(session.user.email)
	if (currentUser?.role?.code !== UserRole.ADMIN) {
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Solo administradores pueden acceder a esta sección',
		}
		return NextResponse.json(errorResponse, { status: 403 })
	}

	try {
		const body = await request.json()
		const input = createColumnSchema.parse(body)

		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const result = await createLeadFunnelColumn(input, {
			userId,
			email: session.user.email,
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
		})

		if ('error' in result && result.error) {
			return NextResponse.json(result, { status: 409 })
		}

		return NextResponse.json(result, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: error.issues[0]?.message || 'Datos inválidos',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		console.error('Error creating lead funnel column:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al crear la columna',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
