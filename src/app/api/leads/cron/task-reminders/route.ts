import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { verifyCronSecret } from '@/lib/auth/verify-cron-secret'
import { sendDueTaskReminders, type ReminderSummary } from '@/features/leads/tasks/lead-task-reminder.service'

/** Cron (every 15 min): in-app reminders for CRM tasks that became due. */
export async function POST(request: Request): Promise<NextResponse<ApiResponse<ReminderSummary>>> {
	if (!verifyCronSecret(request.headers.get('Authorization'))) {
		return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
	}
	try {
		return NextResponse.json({ data: await sendDueTaskReminders() })
	} catch (error) {
		console.error('Error in CRM task-reminders cron route:', error)
		return NextResponse.json({ data: null, error: 'Error interno del servidor' }, { status: 500 })
	}
}
