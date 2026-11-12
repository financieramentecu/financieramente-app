import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { requirePermission } from '@/features/access-control/services/require-permission'
import { setRolePermissions } from '@/features/access-control/services/role-admin.service'
import { rolePermissionsSchema } from '@/features/access-control/lib/role-schemas'
import {
	parseRoleId,
	roleErrorJson,
	roleErrorResponse,
} from '@/features/access-control/lib/role-http'
import {
	auditRoleEvent,
	resolveRoleAuditActor,
} from '@/features/access-control/services/role-audit.service'

/**
 * PUT /api/admin/roles/[id]/permissions
 * Replaces the whole grant set of a role (`roles.gestionar`). ADMIN and SIN_ROL
 * are locked; a role cannot lose `roles.gestionar` from its own actor.
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const guard = await requirePermission('roles.gestionar')
	if (!guard.ok) return guard.response
	const id = parseRoleId((await params).id)
	if (id === null) return roleErrorJson('ID de rol inválido', 400)

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return roleErrorJson('Solicitud inválida', 400)
	}
	const parsed = rolePermissionsSchema.safeParse(body)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return roleErrorJson(issue?.message ?? 'Datos inválidos', 400, { field: issue?.path[0] })
	}

	try {
		const changes = await setRolePermissions(
			prisma,
			id,
			guard.session.user.role ?? '',
			parsed.data.grants
		)
		const total = changes.added.length + changes.removed.length + changes.changed.length
		if (total > 0) {
			await auditRoleEvent({
				action: AuditAction.ROLE_PERMISSIONS_CHANGED,
				actor: resolveRoleAuditActor(guard.session),
				request,
				roleId: id,
				summary:
					`Permisos del rol ${id} modificados ` +
					`(+${changes.added.join(',') || '-'} ~${changes.changed.join(',') || '-'} -${changes.removed.join(',') || '-'})`,
			})
		}
		return NextResponse.json({ data: changes })
	} catch (error) {
		return roleErrorResponse(error, 'Error al guardar los permisos')
	}
}
