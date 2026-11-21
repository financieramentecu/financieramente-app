import { z } from 'zod'
import { TASK_NOTICE_ANTICIPATION } from '@/features/leads/tasks/task-notice.constants'

export const taskNoticeSettingSchema = z
	.object({
		anticipationDays: z
			.number()
			.int('Los días deben ser un número entero.')
			.min(TASK_NOTICE_ANTICIPATION.MIN_DAYS, 'Los días no pueden ser negativos.')
			.max(TASK_NOTICE_ANTICIPATION.MAX_DAYS, 'La anticipación máxima es de 30 días.'),
	})
	.strict()

export interface TaskNoticeSetting {
	anticipationDays: number
}
