import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getAccessibleUserIds, isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'
import { canAccessCrm, canManageCrm } from '@/features/leads/crm/crm-policy'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { leadTaskUpdateSchema } from '@/features/leads/tasks/lead-task.schema'
import { completeLeadTaskTx, reassignLeadTaskTx } from '@/features/leads/tasks/lead-task.service'

interface RouteContext { params: Promise<{ id: string }> }
function error(message: string, status: number) { return NextResponse.json({ data: null, error: message } satisfies ApiResponse<null>, { status }) }
function parseId(value: string) { const result = Number.parseInt(value, 10); return Number.isSafeInteger(result) && result > 0 ? result : null }

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const session = await auth()
		if (!session?.user?.email) return error('No autorizado', 401)
		if (!(await isFeatureEnabledServer('crm_tasks', session.user.email))) return error('CRM no disponible', 404)
		const idLeadTask = parseId((await context.params).id)
		if (!idLeadTask) return error('Identificador de tarea inválido', 400)
		const currentUser = await getCurrentUserByEmail(session.user.email)
		if (!currentUser) return error('Usuario no encontrado', 404)
		const roleCode = currentUser.role?.code
		if (!canAccessCrm(roleCode) || !canManageCrm(roleCode)) return error('Sin permisos para modificar CRM', 403)
		const task = await prisma.leadTask.findUnique({ where: { idLeadTask }, select: { idLeadTask: true, idLead: true, status: true } })
		if (!task) return error('Tarea no encontrada', 404)
		if (task.status !== 'OPEN') return error('La tarea ya no está abierta', 409)
		const visibleUserIds = isHierarchyBypassRole(roleCode) ? [] : await getAccessibleUserIds(currentUser.idUser)
		const lead = await getLeadDetail(task.idLead, currentUser, { visibleUserIds })
		if (!lead) return error('Tarea no encontrada', 404)
		const input = leadTaskUpdateSchema.safeParse(await request.json())
		if (!input.success) return error('Actualización inválida', 400)
		if (input.data.action === 'reassign') {
			const assignedTo = input.data.assignedTo!
			const allowedAssignee = visibleUserIds.length === 0 || assignedTo === currentUser.idUser || visibleUserIds.includes(assignedTo)
			if (!allowedAssignee) return error('No puedes asignar fuera de tu alcance', 403)
			const updated = await prisma.$transaction((tx) => reassignLeadTaskTx(tx, { idLeadTask, idLead: task.idLead, assignedTo, reassignedBy: currentUser.idUser, correlationId: crypto.randomUUID() }))
			return NextResponse.json({ data: updated })
		}
		const updated = await prisma.$transaction((tx) => completeLeadTaskTx(tx, { idLeadTask, idLead: task.idLead, completedBy: currentUser.idUser, correlationId: crypto.randomUUID() }))
		return NextResponse.json({ data: updated })
	} catch (cause) {
		console.error('Error updating lead task:', cause)
		return error('Error al actualizar la tarea', 500)
	}
}
