/**
 * GET /api/agents
 * Returns active AGENTE users scoped to the viewer's hierarchy.
 * - Backoffice roles (ADMIN, ASISTENTE, ANALISTA): all active AGENTEs.
 * - AGENTE at LEVEL_0 (MS Junior): showFilter=false — caller hides the field.
 * - AGENTE at a higher level: only their hierarchy descendants.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { listActiveAgents } from '@/features/shared/services/agent.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { AgentCatalogResult } from '@/features/shared/services/agent.service'

export async function GET(): Promise<NextResponse<ApiResponse<AgentCatalogResult>>> {
	const session = await auth()

	if (!session?.user?.email) {
		return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
	}

	try {
		const viewer = await getCurrentUserByEmail(session.user.email)

		if (!viewer) {
			return NextResponse.json({ data: null, error: 'Usuario no encontrado' }, { status: 404 })
		}

		const result = await listActiveAgents({
			idUser: viewer.idUser,
			roleCode: viewer.role?.code ?? null,
			levelCode: viewer.level?.code ?? null,
		})

		return NextResponse.json({ data: result })
	} catch (error) {
		console.error('Error al obtener agentes:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
