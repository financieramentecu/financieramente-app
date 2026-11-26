/**
 * API Route: /api/crm/hierarchy-tree
 * GET — CRM tree. The company tree is returned only for write-bypass roles
 * or for a person an admin granted the read-only view of other branches.
 */

import { NextResponse } from 'next/server'
import { requireCrmActor } from '@/lib/auth/require-crm-actor'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { buildHierarchyTree } from '@/features/production-dashboard/services/hierarchy-tree.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { PARTNER_EXTERNAL_LEVEL_CODE } from '@/features/shared/lib/level-codes'
import { UserRole, isWriteBypassRole } from '@/features/auth/lib/roles'
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
			viewer.role?.code === UserRole.PARTNER ||
			viewer.level?.code === PARTNER_EXTERNAL_LEVEL_CODE
		) {
			return NextResponse.json({ data: { nodes: [] } })
		}

		const nodes = await buildHierarchyTree(viewer, prisma, {
			fullTree: isWriteBypassRole(viewer.role?.code) || viewer.canViewOthersCrm === true,
		})
		return NextResponse.json({ data: { nodes } })
	} catch (error) {
		console.error('Error al construir el árbol del CRM:', error)
		return NextResponse.json({ data: null, error: 'Error interno del servidor' }, { status: 500 })
	}
}
