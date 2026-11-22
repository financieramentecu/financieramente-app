/**
 * API Route: /api/crm/hierarchy-tree
 * GET — CRM tree. The company tree is returned only for company-scope CRM
 * writers or for a person an admin granted the read-only view of other branches.
 */

import { NextResponse } from 'next/server'
import { requireCrmActor } from '@/lib/auth/require-crm-actor'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { buildHierarchyTree } from '@/features/production-dashboard/services/hierarchy-tree.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { PARTNER_EXTERNAL_LEVEL_CODE } from '@/features/shared/lib/level-codes'
import type { HierarchyTreeData } from '@/features/production-dashboard/types/hierarchy.types'

const MS_JUNIOR_LEVEL_CODE = 'LEVEL_0'

export async function GET(): Promise<NextResponse<ApiResponse<HierarchyTreeData>>> {
	try {
		const guard = await requireCrmActor('leads_module')
		if (!guard.ok) return guard.response

		const viewer = await getCurrentUserByEmail(guard.actor.email)
		if (!viewer) {
			return NextResponse.json({ data: null, error: 'Usuario no encontrado' }, { status: 404 })
		}

		if (
			viewer.level?.code === MS_JUNIOR_LEVEL_CODE ||
			viewer.level?.code === PARTNER_EXTERNAL_LEVEL_CODE
		) {
			return NextResponse.json({ data: { nodes: [] } })
		}

		const nodes = await buildHierarchyTree(viewer, prisma, {
			// Empty visibility = company-wide read (company-scope writer or granted view).
			fullTree: guard.actor.visibleUserIds.length === 0,
		})
		return NextResponse.json({ data: { nodes } })
	} catch (error) {
		console.error('Error al construir el árbol del CRM:', error)
		return NextResponse.json({ data: null, error: 'Error interno del servidor' }, { status: 500 })
	}
}
