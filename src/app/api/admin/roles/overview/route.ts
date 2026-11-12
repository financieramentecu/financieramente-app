import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/features/access-control/services/require-permission'
import { listRolesOverview } from '@/features/access-control/services/role-query.service'
import { roleErrorResponse } from '@/features/access-control/lib/role-http'

/** GET /api/admin/roles/overview — roles with user/permission counts (`roles.ver`). */
export async function GET() {
	const guard = await requirePermission('roles.ver')
	if (!guard.ok) return guard.response
	try {
		return NextResponse.json({ data: await listRolesOverview(prisma) })
	} catch (error) {
		return roleErrorResponse(error, 'Error al listar los roles')
	}
}
