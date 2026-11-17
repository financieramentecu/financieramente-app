const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

const globalState = globalThis as typeof globalThis & {
	crmTaskReminderSchedulerStarted?: boolean
}

async function runDueTaskReminders(): Promise<void> {
	const { sendDueTaskReminders } = await import('@/features/leads/tasks/lead-task-reminder.service')
	try {
		const summary = await sendDueTaskReminders()
		console.info('[crm-task-reminders]', summary)
	} catch (error) {
		console.error('[crm-task-reminders] failed', error)
	}
}

/** Dev stand-in for the 15-minute task-reminders cron. The digest stays on the external crontab. */
export function startCrmTaskReminderScheduler(
	run: () => Promise<void> = runDueTaskReminders,
	intervalMs: number = FIFTEEN_MINUTES_MS
): void {
	if (globalState.crmTaskReminderSchedulerStarted) return
	globalState.crmTaskReminderSchedulerStarted = true
	void run()
	const timer = setInterval(() => {
		void run()
	}, intervalMs)
	timer.unref()
}
