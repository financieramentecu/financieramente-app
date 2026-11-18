import { readApiData } from '@/features/leads/table/lead-table-api'
import type { TaskNoticeSetting } from '@/features/leads/tasks/task-notice.schema'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function fetchTaskNoticeSettings(): Promise<TaskNoticeSetting> {
	return readApiData(await fetch('/api/crm/notification-settings'), 'No fue posible cargar los avisos de vencimiento.')
}

export async function updateTaskNoticeSettings(anticipationDays: number): Promise<TaskNoticeSetting> {
	const response = await fetch('/api/crm/notification-settings', {
		method: 'PUT',
		headers: JSON_HEADERS,
		body: JSON.stringify({ anticipationDays }),
	})
	return readApiData(response, 'No fue posible guardar los días de anticipación.')
}
