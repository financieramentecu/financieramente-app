import { NextResponse } from 'next/server'
import { UserRole } from '@/features/auth/lib/roles'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { getTaskNoticeSetting, saveTaskNoticeSetting } from '@/features/leads/tasks/crm-notification-setting.service'
import { taskNoticeSettingSchema, type TaskNoticeSetting } from '@/features/leads/tasks/task-notice.schema'

/** GET /api/crm/notification-settings — anticipation days for upcoming task notices (admin only). */
export async function GET() {
	try {
		const guard = await requireCrmActor('crm_tasks', { manage: true })
		if (!guard.ok) return guard.response
		if (guard.actor.roleCode !== UserRole.ADMIN) return error('Sin permisos para administrar los avisos', 403)
		return NextResponse.json({ data: await getTaskNoticeSetting() } satisfies ApiResponse<TaskNoticeSetting>)
	} catch (cause) {
		console.error('Error fetching CRM task notice settings:', cause)
		return error('Error al obtener los avisos de vencimiento', 500)
	}
}

/** PUT /api/crm/notification-settings — save anticipation days. Admin only. */
export async function PUT(request: Request) {
	try {
		const guard = await requireCrmActor('crm_tasks', { manage: true })
		if (!guard.ok) return guard.response
		if (guard.actor.roleCode !== UserRole.ADMIN) return error('Sin permisos para administrar los avisos', 403)
		const input = taskNoticeSettingSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Días de anticipación inválidos', 400)
		const data = await saveTaskNoticeSetting(input.data.anticipationDays, toCrmRequestContext(guard.actor, request))
		return NextResponse.json({ data } satisfies ApiResponse<TaskNoticeSetting>)
	} catch (cause) {
		console.error('Error saving CRM task notice settings:', cause)
		return error('Error al guardar los avisos de vencimiento', 500)
	}
}
