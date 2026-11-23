import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startCrmTaskReminderScheduler } from '@/features/leads/tasks/dev-task-reminder-scheduler'

const globalState = globalThis as typeof globalThis & {
	crmTaskReminderSchedulerStarted?: boolean
}

describe('startCrmTaskReminderScheduler', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		delete globalState.crmTaskReminderSchedulerStarted
	})

	afterEach(() => {
		vi.useRealTimers()
		delete globalState.crmTaskReminderSchedulerStarted
	})

	it('runs once at start and again on the interval, and ignores a second start', async () => {
		const run = vi.fn(async () => undefined)

		startCrmTaskReminderScheduler(run, 1_000)
		startCrmTaskReminderScheduler(run, 1_000)
		await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1))

		await vi.advanceTimersByTimeAsync(1_000)
		expect(run).toHaveBeenCalledTimes(2)
	})
})
