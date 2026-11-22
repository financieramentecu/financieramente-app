import { describe, expect, it } from 'vitest'
import {
	isBenignPrismaConnectionError,
	isNeonDatabaseUrl,
	isRetryablePrismaConnectionError,
} from '../prisma-log'

describe('isBenignPrismaConnectionError', () => {
	it('ignores a pooled connection closed by Neon', () => {
		expect(
			isBenignPrismaConnectionError(
				'Error in PostgreSQL connection: Error { kind: Closed, cause: None }'
			)
		).toBe(true)
		expect(
			isBenignPrismaConnectionError(
				'terminating connection due to administrator command, code: SqlState(E57P01)'
			)
		).toBe(true)
		expect(isBenignPrismaConnectionError('Server has closed the connection.')).toBe(true)
	})

	it('keeps real query failures visible', () => {
		expect(isBenignPrismaConnectionError('Unique constraint failed on the fields: (`email`)')).toBe(
			false
		)
	})
})

describe('isRetryablePrismaConnectionError', () => {
	it('retries when the server already closed the connection', () => {
		expect(isRetryablePrismaConnectionError({ code: 'P1017', message: 'closed' })).toBe(true)
		expect(isRetryablePrismaConnectionError({ code: 'P1001', message: 'unreachable' })).toBe(true)
	})

	it('does not retry a constraint or validation error', () => {
		expect(isRetryablePrismaConnectionError({ code: 'P2002', message: 'Unique constraint' })).toBe(
			false
		)
		expect(isRetryablePrismaConnectionError(new Error('boom'))).toBe(false)
		expect(isRetryablePrismaConnectionError('closed')).toBe(false)
	})
})

describe('isNeonDatabaseUrl', () => {
	it('detects a Neon host and ignores other databases', () => {
		expect(
			isNeonDatabaseUrl('postgresql://user:secret@ep-example.us-east-1.aws.neon.tech/neondb')
		).toBe(true)
		expect(isNeonDatabaseUrl('postgresql://user:secret@localhost:5432/app')).toBe(false)
		expect(isNeonDatabaseUrl(undefined)).toBe(false)
	})
})
