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
