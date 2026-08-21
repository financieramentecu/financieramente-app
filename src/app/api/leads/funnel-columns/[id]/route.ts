import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import {
	updateLeadFunnelColumn,
	deleteLeadFunnelColumn,
} from '@/features/leads/services/lead-funnel-column.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

interface RouteContext {
	params: Promise<{ id: string }>
}

const updateColumnSchema = z.object({
	name: z.string().min(1).max(120).optional(),
	position: z.number().int().min(0).optional(),
	externalStatusKey: z.string().min(1).max(150).optional(),
})

async function requireAdmin() {
	const session = await auth()
	if (!session?.user?.email) {
		return { ok: false as const, status: 401, error: 'No autorizado' }
	}

	const currentUser = await getCurrentUserByEmail(session.user.email)
	if (currentUser?.role?.code !== UserRole.ADMIN) {
		return {
			ok: false as const,
			status: 403,
			error: 'Solo administradores pueden acceder a esta sección',
		}
	}

	return { ok: true as const, session, currentUser }
}

export async function PATCH(request: Request, context: RouteContext) {
	const guard = await requireAdmin()
	if (!guard.ok) {
		const errorResponse: ApiResponse<null> = { data: null, error: guard.error }
		return NextResponse.json(errorResponse, { status: guard.status })
	}

	try {
		const { id } = await context.params
		const idLeadFunnelColumn = parseInt(id, 10)
		const body = await request.json()
		const input = updateColumnSchema.parse(body)

		const userId = guard.session.user.id
			? parseInt(guard.session.user.id)
			: undefined
		const result = await updateLeadFunnelColumn(idLeadFunnelColumn, input, {
			userId,
			email: guard.session.user.email ?? undefined,
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
		})

		if ('error' in result && result.error) {
			return NextResponse.json(result, { status: 409 })
		}

		return NextResponse.json(result)
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: error.issues[0]?.message || 'Datos inválidos',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		console.error('Error updating lead funnel column:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al actualizar la columna',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

export async function DELETE(_request: Request, context: RouteContext) {
	const guard = await requireAdmin()
	if (!guard.ok) {
		const errorResponse: ApiResponse<null> = { data: null, error: guard.error }
		return NextResponse.json(errorResponse, { status: guard.status })
	}

	const { id } = await context.params
	const idLeadFunnelColumn = parseInt(id, 10)

	const result = await deleteLeadFunnelColumn(idLeadFunnelColumn, {
		userId: guard.session.user.id ? parseInt(guard.session.user.id) : undefined,
		email: guard.session.user.email ?? undefined,
	})

	if ('error' in result && result.error) {
		return NextResponse.json(result, { status: 409 })
	}

	return NextResponse.json(result)
}
