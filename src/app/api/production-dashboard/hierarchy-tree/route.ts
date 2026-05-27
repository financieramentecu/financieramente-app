/**
 * API Route: /api/production-dashboard/hierarchy-tree
 * GET — Returns the org hierarchy tree scoped to the authenticated viewer's role.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { buildHierarchyTree } from '@/features/production-dashboard/services/hierarchy-tree.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { HierarchyTreeData } from '@/features/production-dashboard/types/hierarchy.types'

/** Level code assigned to MS Junior — receives empty tree per spec */
const MS_JUNIOR_LEVEL_CODE = 'LEVEL_0'

export async function GET(): Promise<NextResponse<ApiResponse<HierarchyTreeData>>> {
	try {
		const session = await auth()

		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const viewer = await getCurrentUserByEmail(session.user.email)

		if (!viewer) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		if (viewer.level?.code === MS_JUNIOR_LEVEL_CODE) {
			return NextResponse.json({ data: { nodes: [] } })
		}

		const nodes = await buildHierarchyTree(viewer, prisma)

		return NextResponse.json({ data: { nodes } })
	} catch (error) {
		console.error('Error al construir el árbol de jerarquía:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
