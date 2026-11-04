import { describe, it, expect } from 'vitest'
import { AuditAction } from '@/features/auth/lib/audit-logger'

describe('AuditAction — leads CSV import', () => {
	it('includes LEAD_CSV_IMPORT_STARTED', () => {
		expect(AuditAction.LEAD_CSV_IMPORT_STARTED).toBe('LEAD_CSV_IMPORT_STARTED')
	})

	it('includes LEAD_CSV_IMPORT_COMPLETED', () => {
		expect(AuditAction.LEAD_CSV_IMPORT_COMPLETED).toBe('LEAD_CSV_IMPORT_COMPLETED')
	})

	it('includes LEAD_CSV_ROW_REJECTED', () => {
		expect(AuditAction.LEAD_CSV_ROW_REJECTED).toBe('LEAD_CSV_ROW_REJECTED')
	})
})

describe('AuditAction — partner settlement exclusion', () => {
	it.each(['SETTLEMENT_EXCLUDED', 'FILE_IMPORT_EXCLUDED_ONLY_CLOSED'])(
		'includes %s with a matching string value that fits the VarChar(50) column',
		(action) => {
			const value = AuditAction[action as keyof typeof AuditAction]
			expect(value).toBe(action)
			expect(value.length).toBeLessThanOrEqual(50)
		}
	)
})

describe('AuditAction — partner profile (PM-08)', () => {
	it.each([
		'PARTNER_CREATED',
		'PARTNER_DEACTIVATED',
		'PARTNER_REACTIVATED',
		'PARTNER_ACTIVATION_RESENT',
		'PARTNER_UPDATED',
		'ACCOUNT_ACTIVATED',
		'PASSWORD_RESET_REQUESTED',
		'PASSWORD_RESET_COMPLETED',
	])('includes %s with a matching string value', (action) => {
		expect(AuditAction[action as keyof typeof AuditAction]).toBe(action)
	})

	it('keeps audit action values unique', () => {
		const values = Object.values(AuditAction)
		expect(new Set(values).size).toBe(values.length)
	})
})
