import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { verifyCronSecret } from '@/lib/auth/verify-cron-secret'
import { sendDailyTaskDigest, type DigestSummary } from '@/features/leads/tasks/lead-task-reminder.service'

/** Cron (daily 07:00 Bogotá): email digest of overdue and today's CRM tasks. */
export async function POST(request: Request): Promise<NextResponse<ApiResponse<DigestSummary>>> {
	if (!verifyCronSecret(request.headers.get('Authorization'))) {
		return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
	}
	try {
		return NextResponse.json({ data: await sendDailyTaskDigest() })
	} catch (error) {
		console.error('Error in CRM task-digest cron route:', error)
		return NextResponse.json({ data: null, error: 'Error interno del servidor' }, { status: 500 })
	}
}
