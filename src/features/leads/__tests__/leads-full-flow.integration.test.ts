import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { UserRole } from '@/features/auth/lib/roles'
import { upsertLeadFromCrm } from '@/features/leads/services/lead-sync.service'
import { getLeadBoard } from '@/features/leads/services/lead-board.service'
import { getLeadForConversion } from '@/features/leads/services/lead-conversion.service'
import { deleteLead } from '@/features/leads/services/lead-admin.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadFunnelColumn: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
		},
		user: {
			findFirst: vi.fn(),
		},
		lead: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
			update: vi.fn(),
			findMany: vi.fn(),
			findFirst: vi.fn(),
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
		LEAD_REACTIVATED: 'LEAD_REACTIVATED',
		LEAD_DELETED: 'LEAD_DELETED',
	},
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'n8n'),
}))

const NEW_COLUMN = {
	idLeadFunnelColumn: 2,
	name: 'Nuevo',
	externalStatusKey: 'new',
	isFallback: false,
	position: 1,
	active: true,
}

describe('Leads full flow: webhook create -> board visibility -> conversion, with audit trail', () => {
	beforeEach(() => vi.clearAllMocks())

	it('creates via webhook, becomes visible on the owner-scoped board, and is eligible for conversion — each step audited', async () => {
		// --- Step 1: webhook creates the lead, owned by user 5 ---
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(NEW_COLUMN as never)
		vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.user.findFirst).mockResolvedValue({ idUser: 5 } as never)
		vi.mocked(prisma.lead.upsert).mockResolvedValue({
			idLead: 100,
			idBusiness: null,
			outcomeStatus: 'OPEN',
		} as never)

		const created = await upsertLeadFromCrm({
			externalCrmId: 'crm-full-flow',
			statusKey: 'new',
			name: 'Juan',
			lastName: 'Perez',
			ownerEmail: 'juan.agent@example.com',
		})

		expect(created.created).toBe(true)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.LEAD_CREATED })
		)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.LEAD_OWNER_ASSIGNED })
		)

		// --- Step 2: the owning agent (idUser=5) sees it on the board ---
		vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([NEW_COLUMN] as never)
		vi.mocked(prisma.lead.findMany).mockResolvedValue([
			{
				idLead: 100,
				idLeadFunnelColumn: 2,
				idUser: 5,
				name: 'Juan',
				lastName: 'Perez',
				email: null,
				phone: null,
				originTag: null,
				outcomeStatus: 'OPEN',
			},
		] as never)

		const board = await getLeadBoard(
			{ idUser: 5, role: { code: UserRole.AGENTE } },
			{ visibleUserIds: [5] }
		)
		const nuevoColumn = board.find((c) => c.idLeadFunnelColumn === 2)
		expect(nuevoColumn?.leads.map((l) => l.idLead)).toContain(100)

		// A different, unrelated agent (idUser=6) must NOT see it
		vi.mocked(prisma.lead.findMany).mockResolvedValue([])
		const otherBoard = await getLeadBoard(
			{ idUser: 6, role: { code: UserRole.AGENTE } },
			{ visibleUserIds: [6] }
		)
		expect(otherBoard.flatMap((c) => c.leads)).toHaveLength(0)

		// --- Step 3: the owning agent can resolve the lead for conversion ---
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({
			idLead: 100,
			idBusiness: null,
			idUser: 5,
			outcomeStatus: 'OPEN',
		} as never)

		const leadForConversion = await getLeadForConversion(
			100,
			{ idUser: 5, role: { code: UserRole.AGENTE } },
			{ visibleUserIds: [5] }
		)
		expect(leadForConversion?.idLead).toBe(100)

		// `createBusiness({ idLead: 100 })` (Phase 6) is exercised end-to-end
		// in create-business.test.ts; this flow test stops at the point where
		// the leads feature hands off to it.
	})

	it('outcomeStatus lifecycle: default OPEN -> webhook to WON -> unresolved fallback -> WON lock on a later webhook', async () => {
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(NEW_COLUMN as never)

		// --- Step 1: webhook creates the lead, defaults to OPEN ---
		vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce(null)
		vi.mocked(prisma.lead.upsert).mockResolvedValueOnce({
			idLead: 200,
			outcomeStatus: 'OPEN',
		} as never)

		const created = await upsertLeadFromCrm({
			externalCrmId: 'crm-outcome-flow',
			statusKey: 'new',
		})
		expect(created.created).toBe(true)

		// --- Step 2: a later webhook moves it to WON -> exactly one CHANGED ---
		vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
			idLead: 200,
			idBusiness: null,
			outcomeStatus: 'OPEN',
		} as never)
		vi.mocked(prisma.lead.upsert).mockResolvedValueOnce({
			idLead: 200,
			outcomeStatus: 'WON',
		} as never)

		vi.mocked(logAuditEvent).mockClear()
		await upsertLeadFromCrm({
			externalCrmId: 'crm-outcome-flow',
			statusKey: 'new',
			outcomeStatus: 'WON',
		})
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.LEAD_OUTCOME_STATUS_CHANGED })
		)

		// --- Step 3: the board query for outcomeStatus=WON returns the lead ---
		vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([NEW_COLUMN] as never)
		vi.mocked(prisma.lead.findMany).mockResolvedValue([
			{
				idLead: 200,
				idLeadFunnelColumn: 2,
				idUser: null,
				name: null,
				lastName: null,
				email: null,
				phone: null,
				originTag: null,
				outcomeStatus: 'WON',
			},
		] as never)

		const wonBoard = await getLeadBoard(
			{ idUser: 1, role: { code: UserRole.ADMIN } },
			{ outcomeStatuses: ['WON'] }
		)
		expect(wonBoard.flatMap((c) => c.leads).map((l) => l.idLead)).toContain(200)

		// --- Step 4: an unrecognized value falls back to OPEN + UNRESOLVED ---
		vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
			idLead: 200,
			idBusiness: null,
			outcomeStatus: 'WON',
		} as never)
		vi.mocked(prisma.lead.upsert).mockResolvedValueOnce({
			idLead: 200,
			outcomeStatus: 'WON',
		} as never)

		vi.mocked(logAuditEvent).mockClear()
		await upsertLeadFromCrm({
			externalCrmId: 'crm-outcome-flow',
			statusKey: 'new',
			outcomeStatus: 'GHOSTED',
		})
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.LEAD_OUTCOME_STATUS_UNRESOLVED,
			})
		)

		// --- Step 5: WON is terminal — a further webhook to LOST is locked ---
		vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
			idLead: 200,
			idBusiness: null,
			outcomeStatus: 'WON',
		} as never)
		vi.mocked(prisma.lead.upsert).mockResolvedValueOnce({
			idLead: 200,
			outcomeStatus: 'WON',
		} as never)

		vi.mocked(logAuditEvent).mockClear()
		const lockedResult = await upsertLeadFromCrm({
			externalCrmId: 'crm-outcome-flow',
			statusKey: 'new',
			outcomeStatus: 'LOST',
		})
		expect(lockedResult.idLead).toBe(200)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.LEAD_OUTCOME_STATUS_LOCKED })
		)
		expect(logAuditEvent).not.toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.LEAD_OUTCOME_STATUS_CHANGED })
		)

		// The board query for outcomeStatus=WON still returns the lead unchanged
		const wonBoardAfterLock = await getLeadBoard(
			{ idUser: 1, role: { code: UserRole.ADMIN } },
			{ outcomeStatuses: ['WON'] }
		)
		expect(
			wonBoardAfterLock.flatMap((c) => c.leads).map((l) => l.idLead)
		).toContain(200)
	})

	describe('historical timestamps: replay-safe createdAt + revive-on-resync', () => {
		it('a resync carrying createdAt in the payload leaves the stored origin date unchanged', async () => {
			vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(
				NEW_COLUMN as never
			)

			const originalCreatedAt = new Date('2020-01-01T00:00:00Z')
			vi.mocked(prisma.lead.findUnique).mockResolvedValue({
				idLead: 300,
				idBusiness: null,
				outcomeStatus: 'OPEN',
				active: true,
				createdAt: originalCreatedAt,
			} as never)
			vi.mocked(prisma.lead.upsert).mockResolvedValue({
				idLead: 300,
				idBusiness: null,
				outcomeStatus: 'OPEN',
			} as never)

			await upsertLeadFromCrm({
				externalCrmId: 'crm-historical',
				statusKey: 'new',
				createdAt: new Date('2024-06-01T00:00:00Z'),
			})

			const upsertCall = vi.mocked(prisma.lead.upsert).mock.calls[0][0]
			expect(upsertCall.update).not.toHaveProperty('createdAt')
		})

		it('a CRM resync of a soft-deleted lead revives it — delete then resync round trip', async () => {
			vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(
				NEW_COLUMN as never
			)
			vi.mocked(prisma.lead.findUnique).mockResolvedValue({
				idLead: 400,
				idBusiness: null,
				outcomeStatus: 'OPEN',
				active: false,
			} as never)
			vi.mocked(prisma.lead.upsert).mockResolvedValue({
				idLead: 400,
				idBusiness: null,
				outcomeStatus: 'OPEN',
			} as never)

			await upsertLeadFromCrm({
				externalCrmId: 'crm-deleted-then-resync',
				statusKey: 'new',
			})

			const upsertCall = vi.mocked(prisma.lead.upsert).mock.calls[0][0]
			expect(upsertCall.update.active).toBe(true)
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ action: AuditAction.LEAD_REACTIVATED })
			)
		})
	})

	describe('admin delete then CRM resync round trip', () => {
		it('an admin-deleted lead disappears from the board, then a CRM resync of the same externalCrmId restores it', async () => {
			vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([NEW_COLUMN] as never)

			// --- Admin deletes the eligible lead (soft delete) ---
			vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
				idLead: 500,
				idBusiness: null,
				outcomeStatus: 'OPEN',
				active: true,
			} as never)
			vi.mocked(prisma.lead.update).mockResolvedValueOnce({
				idLead: 500,
				active: false,
			} as never)

			const deleteResult = await deleteLead(500)
			expect(deleteResult.data).toEqual({ idLead: 500 })

			// --- Board no longer returns it (DB-level `active: true` filter simulated) ---
			vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([])
			const boardAfterDelete = await getLeadBoard(
				{ idUser: 1, role: { code: UserRole.ADMIN } },
				{}
			)
			expect(
				boardAfterDelete.flatMap((c) => c.leads).map((l) => l.idLead)
			).not.toContain(500)

			// --- CRM resync of the same externalCrmId revives it ---
			vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(
				NEW_COLUMN as never
			)
			vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
				idLead: 500,
				idBusiness: null,
				outcomeStatus: 'OPEN',
				active: false,
			} as never)
			vi.mocked(prisma.lead.upsert).mockResolvedValueOnce({
				idLead: 500,
				idBusiness: null,
				outcomeStatus: 'OPEN',
			} as never)

			await upsertLeadFromCrm({
				externalCrmId: 'crm-deleted-then-resync-full-flow',
				statusKey: 'new',
			})

			const upsertCall = vi.mocked(prisma.lead.upsert).mock.calls[
				vi.mocked(prisma.lead.upsert).mock.calls.length - 1
			][0]
			expect(upsertCall.update.active).toBe(true)

			// --- Board returns it again ---
			vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([
				{
					idLead: 500,
					idLeadFunnelColumn: 2,
					idUser: null,
					name: null,
					lastName: null,
					email: null,
					phone: null,
					originTag: null,
					outcomeStatus: 'OPEN',
				},
			] as never)
			const boardAfterResync = await getLeadBoard(
				{ idUser: 1, role: { code: UserRole.ADMIN } },
				{}
			)
			expect(
				boardAfterResync.flatMap((c) => c.leads).map((l) => l.idLead)
			).toContain(500)
		})
	})
})
