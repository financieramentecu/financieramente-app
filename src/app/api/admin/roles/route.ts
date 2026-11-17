import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/nextauth'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { requirePermission } from '@/features/access-control/services/require-permission'
import { createRole } from '@/features/access-control/services/role-admin.service'
import { roleInputSchema } from '@/features/access-control/lib/role-schemas'
import {
	roleErrorJson,
	roleErrorResponse,
} from '@/features/access-control/lib/role-http'
import {
	auditRoleEvent,
	resolveRoleAuditActor,
} from '@/features/access-control/services/role-audit.service'

/**
 * GET /api/admin/roles
 *
 * Lista todos los roles activos del sistema
 */
export async function GET() {
    try {
        // Verificar autenticación
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'No autorizado' },
                { status: 401 }
            )
        }

        // Obtener roles activos
        const roles = await prisma.role.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
            select: {
                idRole: true,
                code: true,
                name: true,
                description: true,
            },
        })

        // Map to frontend format
        const formattedRoles = roles.map((role) => ({
            id: role.idRole,
            code: role.code,
            name: role.name,
            description: role.description,
        }))

        return NextResponse.json({
            success: true,
            data: formattedRoles,
        })
    } catch (error) {
        console.error('Error fetching roles:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Error al obtener roles',
                details: error instanceof Error ? error.message : 'Error desconocido',
            },
            { status: 500 }
        )
    }
}

/**
 * POST /api/admin/roles
 * Creates a custom role with no permissions (requires `roles.gestionar`).
 */
export async function POST(request: Request) {
	const guard = await requirePermission('roles.gestionar')
	if (!guard.ok) return guard.response

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return roleErrorJson('Solicitud inválida', 400)
	}
	const parsed = roleInputSchema.safeParse(body)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return roleErrorJson(issue?.message ?? 'Datos inválidos', 400, {
			field: issue?.path[0],
		})
	}

	try {
		const role = await createRole(prisma, parsed.data)
		await auditRoleEvent({
			action: AuditAction.ROLE_CREATED,
			actor: resolveRoleAuditActor(guard.session),
			request,
			roleId: role.idRole,
			summary: `Rol creado: ${role.name} (${role.code})`,
		})
		return NextResponse.json(
			{ data: { id: role.idRole, code: role.code, name: role.name, description: role.description } },
			{ status: 201 }
		)
	} catch (error) {
		return roleErrorResponse(error, 'Error al crear el rol')
	}
}
