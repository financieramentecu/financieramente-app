import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import {
	resolveFunnelColumn,
	resolveOwner,
	upsertLeadFromCrm,
} from '@/features/leads/services/lead-sync.service'

const FALLBACK_COLUMN = {
	idLeadFunnelColumn: 1,
	externalStatusKey: '__unmapped__',
	name: 'Sin mapear',
	isFallback: true,
	position: 0,
	active: true,
}

function makeExistingLead(overrides: Record<string, unknown> = {}) {
	return {
		idLead: 10,
		externalCrmId: 'crm-1',
		name: 'Juan',
		lastName: 'Perez',
		email: null,
		phone: null,
		identityNumber: null,
		originTag: null,
		externalUrl: null,
		idUser: null,
		idLeadFunnelColumn: 1,
		idBusiness: null,
		outcomeStatus: 'OPEN',
		active: true,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		...overrides,
	}
}

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadFunnelColumn: {
			findFirst: vi.fn(),
		},
		user: {
			findFirst: vi.fn(),
		},
		lead: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
		},
	},
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		LEAD_CREATED: 'LEAD_CREATED',
		LEAD_STATUS_CHANGED: 'LEAD_STATUS_CHANGED',
		LEAD_OWNER_ASSIGNED: 'LEAD_OWNER_ASSIGNED',
		LEAD_OWNER_UNRESOLVED: 'LEAD_OWNER_UNRESOLVED',
		LEAD_OUTCOME_STATUS_CHANGED: 'LEAD_OUTCOME_STATUS_CHANGED',
		LEAD_OUTCOME_STATUS_UNRESOLVED: 'LEAD_OUTCOME_STATUS_UNRESOLVED',
		LEAD_OUTCOME_STATUS_LOCKED: 'LEAD_OUTCOME_STATUS_LOCKED',
	},
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'n8n'),
}))

describe('resolveFunnelColumn', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns the matched column when statusKey maps to one', async () => {
		const wonColumn = { ...FALLBACK_COLUMN, idLeadFunnelColumn: 5, externalStatusKey: 'won', isFallback: false }
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(
			wonColumn as never
		)

		const result = await resolveFunnelColumn('won')
		expect(result.idLeadFunnelColumn).toBe(5)
	})

	it('falls back to the "Sin mapear" column when statusKey matches nothing', async () => {
		vi.mocked(prisma.leadFunnelColumn.findFirst)
			.mockResolvedValueOnce(null) // exact statusKey lookup misses
			.mockResolvedValueOnce(FALLBACK_COLUMN as never) // fallback lookup

		const result = await resolveFunnelColumn('unknown_stage')
		expect(result.isFallback).toBe(true)
		expect(result.externalStatusKey).toBe('__unmapped__')
	})
})

describe('resolveOwner', () => {
	beforeEach(() => vi.clearAllMocks())

	it('reassigns to a different resolved owner when ownerEmail matches a User', async () => {
		vi.mocked(prisma.user.findFirst).mockResolvedValue({
			idUser: 99,
		} as never)

		const result = await resolveOwner('agent@example.com')
		expect(result).toBe(99)
	})

	it('preserves current owner (returns undefined) when ownerEmail is absent', async () => {
		const result = await resolveOwner(undefined)
		expect(result).toBeUndefined()
		expect(prisma.user.findFirst).not.toHaveBeenCalled()
	})

	it('preserves current owner (returns undefined) when ownerEmail is empty', async () => {
		const result = await resolveOwner('')
		expect(result).toBeUndefined()
	})

	it('nulls the owner when ownerEmail matches no User', async () => {
		vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

		const result = await resolveOwner('typo@example.com')
		expect(result).toBeNull()
	})

	it('matches case-insensitively and trims whitespace', async () => {
		vi.mocked(prisma.user.findFirst).mockResolvedValue({
			idUser: 99,
		} as never)

		const result = await resolveOwner('  Agent@Example.com  ')

		expect(result).toBe(99)
		expect(prisma.user.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					email: { equals: 'Agent@Example.com', mode: 'insensitive' },
				}),
			})
		)
	})
})

describe('upsertLeadFromCrm', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(
			FALLBACK_COLUMN as never
		)
		vi.mocked(prisma.lead.upsert).mockResolvedValue({
			idLead: 10,
		} as never)
	})

	it('creates a lead and logs LEAD_CREATED when it did not previously exist', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)

		const result = await upsertLeadFromCrm({
			externalCrmId: 'crm-1',
			statusKey: '__unmapped__',
		})

		expect(result.created).toBe(true)
		expect(prisma.lead.upsert).toHaveBeenCalled()
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.LEAD_CREATED })
		)
	})

	it('logs LEAD_OWNER_UNRESOLVED when ownerEmail matches no User', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

		await upsertLeadFromCrm({
			externalCrmId: 'crm-2',
			statusKey: '__unmapped__',
			ownerEmail: 'typo@example.com',
		})

		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.LEAD_OWNER_UNRESOLVED,
			})
		)
	})

	describe('outcomeStatus resolution (D14, not yet WON)', () => {
		it('defaults to OPEN when created without outcomeStatus (no attempt, no audit)', async () => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)

			await upsertLeadFromCrm({ externalCrmId: 'crm-1', statusKey: 'new' })

			const upsertCall = vi.mocked(prisma.lead.upsert).mock.calls[0][0]
			expect(upsertCall.create).not.toHaveProperty('outcomeStatus')
			expect(logAuditEvent).not.toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_CHANGED,
				})
			)
		})

		it('preserves the stored outcomeStatus when the payload omits it on update', async () => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(
				makeExistingLead({ outcomeStatus: 'LOST' }) as never
			)

			await upsertLeadFromCrm({ externalCrmId: 'crm-1', statusKey: 'new' })

			const upsertCall = vi.mocked(prisma.lead.upsert).mock.calls[0][0]
			expect(upsertCall.update).not.toHaveProperty('outcomeStatus')
			expect(logAuditEvent).not.toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_CHANGED,
				})
			)
		})

		it('overwrites a recognized different value and emits exactly one LEAD_OUTCOME_STATUS_CHANGED', async () => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(
				makeExistingLead({ outcomeStatus: 'OPEN' }) as never
			)

			await upsertLeadFromCrm({
				externalCrmId: 'crm-1',
				statusKey: 'new',
				outcomeStatus: 'LOST',
			})

			const upsertCall = vi.mocked(prisma.lead.upsert).mock.calls[0][0]
			expect(upsertCall.update).toMatchObject({ outcomeStatus: 'LOST' })
			expect(logAuditEvent).toHaveBeenCalledTimes(1 + 1) // LEAD_STATUS_CHANGED + this one
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_CHANGED,
				})
			)
		})

		it('normalizes an unrecognized value to OPEN, audits UNRESOLVED, and still returns 200-equivalent success', async () => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(
				makeExistingLead({ outcomeStatus: 'OPEN' }) as never
			)

			const result = await upsertLeadFromCrm({
				externalCrmId: 'crm-1',
				statusKey: 'new',
				outcomeStatus: 'IN_REVIEW',
			})

			expect(result.idLead).toBe(10)
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_UNRESOLVED,
				})
			)
		})

		it('stays silent (no LEAD_OUTCOME_STATUS_CHANGED) on an identical re-post', async () => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(
				makeExistingLead({ outcomeStatus: 'LOST' }) as never
			)

			await upsertLeadFromCrm({
				externalCrmId: 'crm-1',
				statusKey: 'new',
				outcomeStatus: 'LOST',
			})

			expect(logAuditEvent).not.toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_CHANGED,
				})
			)
		})
	})

	describe('outcomeStatus lock — WON is terminal (D19-D23)', () => {
		it('discards a different recognized outcomeStatus, keeps WON, still updates other fields, audits exactly one LOCKED and zero CHANGED', async () => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(
				makeExistingLead({ outcomeStatus: 'WON', idBusiness: null }) as never
			)
			vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue({
				...FALLBACK_COLUMN,
				idLeadFunnelColumn: 7,
				externalStatusKey: 'negotiation',
				isFallback: false,
			} as never)

			await upsertLeadFromCrm({
				externalCrmId: 'crm-1',
				statusKey: 'negotiation',
				outcomeStatus: 'LOST',
			})

			const upsertCall = vi.mocked(prisma.lead.upsert).mock.calls[0][0]
			expect(upsertCall.update).toMatchObject({
				outcomeStatus: 'WON',
				idLeadFunnelColumn: 7,
			})
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_LOCKED,
				})
			)
			expect(logAuditEvent).not.toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_CHANGED,
				})
			)
		})

		it('does not lock/audit at all when the payload omits outcomeStatus entirely', async () => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(
				makeExistingLead({ outcomeStatus: 'WON' }) as never
			)

			await upsertLeadFromCrm({ externalCrmId: 'crm-1', statusKey: 'new' })

			expect(logAuditEvent).not.toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_LOCKED,
				})
			)
		})

		it('re-posting WON on a WON lead is idempotent: no lock, no CHANGED', async () => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(
				makeExistingLead({ outcomeStatus: 'WON' }) as never
			)

			await upsertLeadFromCrm({
				externalCrmId: 'crm-1',
				statusKey: 'new',
				outcomeStatus: 'WON',
			})

			expect(logAuditEvent).not.toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_LOCKED,
				})
			)
			expect(logAuditEvent).not.toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_CHANGED,
				})
			)
		})

		it('an unrecognized value against a WON lead emits BOTH UNRESOLVED and LOCKED, lead stays WON', async () => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(
				makeExistingLead({ outcomeStatus: 'WON' }) as never
			)

			await upsertLeadFromCrm({
				externalCrmId: 'crm-1',
				statusKey: 'new',
				outcomeStatus: 'CLOSED',
			})

			const upsertCall = vi.mocked(prisma.lead.upsert).mock.calls[0][0]
			expect(upsertCall.update).toMatchObject({ outcomeStatus: 'WON' })
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_UNRESOLVED,
				})
			)
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_LOCKED,
				})
			)
		})

		it('lock behaves identically whether the WON lead is already converted (idBusiness set) or not', async () => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(
				makeExistingLead({ outcomeStatus: 'WON', idBusiness: 42 }) as never
			)

			await upsertLeadFromCrm({
				externalCrmId: 'crm-1',
				statusKey: 'new',
				outcomeStatus: 'ABANDONED',
			})

			const upsertCall = vi.mocked(prisma.lead.upsert).mock.calls[0][0]
			expect(upsertCall.update).toMatchObject({ outcomeStatus: 'WON' })
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.LEAD_OUTCOME_STATUS_LOCKED,
				})
			)
		})
	})
})
