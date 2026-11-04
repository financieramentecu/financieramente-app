import { describe, it, expect, vi, beforeEach } from 'vitest'

const logAuditEvent = vi.hoisted(() => vi.fn())

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent,
	AuditAction: {
		SETTLEMENT_EXCLUDED: 'SETTLEMENT_EXCLUDED',
		FILE_IMPORT_EXCLUDED_ONLY_CLOSED: 'FILE_IMPORT_EXCLUDED_ONLY_CLOSED',
	},
}))

import {
	auditExcludedOnlyFileClosed,
	auditSettlementsExcluded,
} from '../../services/excluded-audit.service'

const CTX = {
	userId: 5,
	email: 'admin@test.com',
	ipAddress: '10.0.0.1',
	userAgent: 'vitest',
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('auditSettlementsExcluded', () => {
	it('logs ONE aggregated SETTLEMENT_EXCLUDED event with the count and the request context', async () => {
		await auditSettlementsExcluded(CTX, {
			source: 'LOAD',
			excludedCount: 12,
			fileImportId: 100,
		})

		expect(logAuditEvent).toHaveBeenCalledTimes(1)
		const call = logAuditEvent.mock.calls[0][0]
		expect(call).toMatchObject({ action: 'SETTLEMENT_EXCLUDED', ...CTX })
		expect(JSON.parse(call.details)).toEqual({
			entityType: 'FILE_IMPORT',
			fileImportId: 100,
			source: 'LOAD',
			excludedCount: 12,
		})
	})

	it('describes a single lag recovery by settlement row and business', async () => {
		await auditSettlementsExcluded(CTX, {
			source: 'LAG_RECOVERY',
			excludedCount: 1,
			idSettlementCommission: 9,
			idBusiness: 70,
		})

		const call = logAuditEvent.mock.calls[0][0]
		expect(JSON.parse(call.details)).toEqual({
			entityType: 'SETTLEMENT_COMMISSION',
			idSettlementCommission: 9,
			idBusiness: 70,
			source: 'LAG_RECOVERY',
			excludedCount: 1,
		})
	})

	it('works without a context (no session available) and skips when nothing was excluded', async () => {
		await auditSettlementsExcluded(undefined, {
			source: 'PRE_LIQUIDACION',
			excludedCount: 2,
			fileImportId: 1,
		})
		expect(logAuditEvent).toHaveBeenCalledTimes(1)
		expect(logAuditEvent.mock.calls[0][0].action).toBe('SETTLEMENT_EXCLUDED')
		expect(logAuditEvent.mock.calls[0][0].userId).toBeUndefined()

		logAuditEvent.mockClear()
		await auditSettlementsExcluded(CTX, {
			source: 'LOAD',
			excludedCount: 0,
			fileImportId: 1,
		})
		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})

describe('auditExcludedOnlyFileClosed', () => {
	it('logs FILE_IMPORT_EXCLUDED_ONLY_CLOSED with the transition and count', async () => {
		await auditExcludedOnlyFileClosed(CTX, {
			fileImportId: 7,
			excludedCount: 4,
			fromStatus: 'PRE-SETTLED',
			toStatus: 'SETTLED',
		})

		const call = logAuditEvent.mock.calls[0][0]
		expect(call).toMatchObject({
			action: 'FILE_IMPORT_EXCLUDED_ONLY_CLOSED',
			...CTX,
		})
		expect(JSON.parse(call.details)).toEqual({
			entityType: 'FILE_IMPORT',
			fileImportId: 7,
			fromStatus: 'PRE-SETTLED',
			toStatus: 'SETTLED',
			excludedCount: 4,
		})
	})
})
