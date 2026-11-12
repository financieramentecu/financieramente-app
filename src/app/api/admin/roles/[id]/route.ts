import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { requirePermission } from '@/features/access-control/services/require-permission'
import {
	deactivateRole,
	updateRole,
} from '@/features/access-control/services/role-admin.service'
import { getRoleDetail } from '@/features/access-control/services/role-query.service'
import { roleInputSchema } from '@/features/access-control/lib/role-schemas'
import {
	parseRoleId,
	roleErrorJson,
	roleErrorResponse,
} from '@/features/access-control/lib/role-http'
import {
	auditRoleEvent,
	resolveRoleAuditActor,
} from '@/features/access-control/services/role-audit.service'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/admin/roles/[id] — role, its grants and the permission catalog (`roles.ver`). */
export async function GET(_request: Request, { params }: RouteContext) {
	const guard = await requirePermission('roles.ver')
	if (!guard.ok) return guard.response
	const id = parseRoleId((await params).id)
	if (id === null) return roleErrorJson('ID de rol inválido', 400)
	try {
		return NextResponse.json({ data: await getRoleDetail(prisma, id) })
	} catch (error) {
		return roleErrorResponse(error, 'Error al obtener el rol')
	}
}

/** PUT /api/admin/roles/[id] — edits name and description (`roles.gestionar`). */
export async function PUT(request: Request, { params }: RouteContext) {
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
	const parsed = roleInputSchema.safeParse(body)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return roleErrorJson(issue?.message ?? 'Datos inválidos', 400, { field: issue?.path[0] })
	}

	try {
		const role = await updateRole(prisma, id, parsed.data)
		await auditRoleEvent({
			action: AuditAction.ROLE_UPDATED,
			actor: resolveRoleAuditActor(guard.session),
			request,
			roleId: id,
			summary: `Rol actualizado: ${role.name}`,
		})
		return NextResponse.json({ data: { id, name: role.name, description: role.description } })
	} catch (error) {
		return roleErrorResponse(error, 'Error al actualizar el rol')
	}
}

/** DELETE /api/admin/roles/[id] — soft delete (`roles.gestionar`). */
export async function DELETE(request: Request, { params }: RouteContext) {
	const guard = await requirePermission('roles.gestionar')
	if (!guard.ok) return guard.response
	const id = parseRoleId((await params).id)
	if (id === null) return roleErrorJson('ID de rol inválido', 400)

	try {
		const role = await deactivateRole(prisma, id, guard.session.user.role ?? '')
		await auditRoleEvent({
			action: AuditAction.ROLE_DEACTIVATED,
			actor: resolveRoleAuditActor(guard.session),
			request,
			roleId: id,
			summary: `Rol desactivado: ${role.name}`,
		})
		return NextResponse.json({ data: { success: true } })
	} catch (error) {
		return roleErrorResponse(error, 'Error al desactivar el rol')
	}
}
