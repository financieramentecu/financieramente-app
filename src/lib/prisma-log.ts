/**
 * Neon suspends an idle compute and closes every pooled backend at once.
 * Prisma then prints one error per connection (`kind: Closed` / SQLSTATE 57P01).
 * Those are reconnects, not failed queries, so they stay out of the terminal.
 */

const BENIGN_CONNECTION_MARKERS = [
	'kind: Closed',
	'Server has closed the connection',
	'E57P01',
	'terminating connection due to administrator command',
] as const

const RETRYABLE_CONNECTION_CODES = ['P1001', 'P1017'] as const

export function isBenignPrismaConnectionError(message: string): boolean {
	return BENIGN_CONNECTION_MARKERS.some((marker) => message.includes(marker))
}

export function isRetryablePrismaConnectionError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false

	if ('code' in error && typeof error.code === 'string') {
		const code = error.code
		if (RETRYABLE_CONNECTION_CODES.some((retryable) => retryable === code)) return true
	}

	if ('message' in error && typeof error.message === 'string') {
		return isBenignPrismaConnectionError(error.message)
	}

	return false
}

export function isNeonDatabaseUrl(databaseUrl: string | undefined): boolean {
	if (!databaseUrl) return false

	try {
		return new URL(databaseUrl).hostname.endsWith('.neon.tech')
	} catch {
		return databaseUrl.includes('.neon.tech')
	}
}
