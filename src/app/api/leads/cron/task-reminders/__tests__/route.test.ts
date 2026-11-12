import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as reminders } from '../route'
import { POST as digest } from '../../task-digest/route'
import { verifyCronSecret } from '@/lib/auth/verify-cron-secret'
import { sendDailyTaskDigest, sendDueTaskReminders } from '@/features/leads/tasks/lead-task-reminder.service'

vi.mock('@/lib/auth/verify-cron-secret', () => ({ verifyCronSecret: vi.fn() }))
vi.mock('@/features/leads/tasks/lead-task-reminder.service', () => ({
	sendDueTaskReminders: vi.fn(),
	sendDailyTaskDigest: vi.fn(),
}))
vi.mock('next/server', () => ({
	NextResponse: { json: vi.fn((data, init) => ({ status: init?.status ?? 200, json: () => Promise.resolve(data) })) },
}))

const request = () => new Request('http://x', { method: 'POST', headers: { Authorization: 'Bearer s' } })

describe('CRM cron routes', () => {
	beforeEach(() => vi.clearAllMocks())

	it.each([
		['task-reminders', reminders, sendDueTaskReminders],
		['task-digest', digest, sendDailyTaskDigest],
	] as const)('%s rejects a bad secret', async (_name, handler, job) => {
		vi.mocked(verifyCronSecret).mockReturnValue(false)
		expect((await handler(request())).status).toBe(401)
		expect(job).not.toHaveBeenCalled()
	})

	it('task-reminders returns the job summary', async () => {
		vi.mocked(verifyCronSecret).mockReturnValue(true)
		vi.mocked(sendDueTaskReminders).mockResolvedValue({ processed: 2, notified: 2, failed: 0 })
		const response = await reminders(request())
		expect(await response.json()).toEqual({ data: { processed: 2, notified: 2, failed: 0 } })
	})

	it('task-digest returns 500 when the job throws', async () => {
		vi.mocked(verifyCronSecret).mockReturnValue(true)
		vi.mocked(sendDailyTaskDigest).mockRejectedValue(new Error('db'))
		expect((await digest(request())).status).toBe(500)
	})
})
