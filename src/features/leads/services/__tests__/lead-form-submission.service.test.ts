import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import {
	ingestLeadFormSubmission,
	LeadFormSubmissionError,
} from '@/features/leads/services/lead-form-submission.service'
import type { FormSubmissionPayload } from '@/features/leads/types/form-submission.schema'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: vi.fn(),
		leadFormSubmission: { findUnique: vi.fn(), create: vi.fn() },
		lead: { findMany: vi.fn(), create: vi.fn() },
		leadFunnelColumn: { findFirst: vi.fn() },
		user: { findFirst: vi.fn() },
		leadStageHistory: { create: vi.fn() },
	},
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		LEAD_CREATED: 'LEAD_CREATED',
		LEAD_OWNER_UNRESOLVED: 'LEAD_OWNER_UNRESOLVED',
		LEAD_FORM_SUBMISSION_STORED: 'LEAD_FORM_SUBMISSION_STORED',
	},
}))

const payload: FormSubmissionPayload = {
	submissionId: 'credito-libre:9f3c1a',
	submittedAt: new Date('2026-11-18T18:44:00.000Z'),
	landing: { key: 'credito-libre', name: 'Crédito libre inversión', version: '3' },
	lead: {
		statusKey: 'nuevo',
		name: 'Ana',
		lastName: 'Pérez',
		email: 'ana@correo.com',
		phone: '3001234567',
		identityNumber: '1234567890',
		originTag: 'Crédito libre inversión',
		ownerEmail: undefined,
	},
	fields: [{ key: 'monto', label: 'Monto solicitado', type: 'number', value: 0 }],
}

describe('ingestLeadFormSubmission', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			if (typeof callback === 'function') return callback(prisma as never)
			return undefined
		})
		vi.mocked(prisma.leadFormSubmission.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.lead.findMany).mockResolvedValue([])
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue({
			idLeadFunnelColumn: 4,
			externalStatusKey: 'nuevo',
		} as never)
		vi.mocked(prisma.lead.create).mockResolvedValue({ idLead: 21 } as never)
		vi.mocked(prisma.leadFormSubmission.create).mockResolvedValue({} as never)
		vi.mocked(prisma.leadStageHistory.create).mockResolvedValue({} as never)
	})

	it('replays a known submission without writing', async () => {
		vi.mocked(prisma.leadFormSubmission.findUnique).mockResolvedValue({ idLead: 8 } as never)

		await expect(ingestLeadFormSubmission(payload)).resolves.toEqual({
			idLead: 8,
			created: false,
			replayed: true,
		})
		expect(prisma.lead.create).not.toHaveBeenCalled()
		expect(prisma.leadFormSubmission.create).not.toHaveBeenCalled()
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('appends a snapshot when the document already belongs to a prospect', async () => {
		vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([{ idLead: 15 }] as never)

		await expect(ingestLeadFormSubmission(payload)).resolves.toEqual({
			idLead: 15,
			created: false,
			replayed: false,
		})
		expect(prisma.lead.create).not.toHaveBeenCalled()
		expect(prisma.leadFormSubmission.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ idLead: 15, submissionId: payload.submissionId }),
			})
		)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.LEAD_FORM_SUBMISSION_STORED })
		)
	})

	it('creates the prospect and the snapshot together when nobody matches', async () => {
		const result = await ingestLeadFormSubmission(payload)

		expect(result).toEqual({ idLead: 21, created: true, replayed: false })
		expect(prisma.lead.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					identityNumber: '1234567890',
					idLeadFunnelColumn: 4,
					originTag: 'Crédito libre inversión',
				}),
			})
		)
		expect(prisma.leadStageHistory.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ source: 'LANDING_FORM', idLead: 21 }) })
		)
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_CREATED }))
	})

	it('refuses an ambiguous match before any write', async () => {
		vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([{ idLead: 1 }, { idLead: 2 }] as never)

		await expect(ingestLeadFormSubmission(payload)).rejects.toBeInstanceOf(LeadFormSubmissionError)
		expect(prisma.lead.create).not.toHaveBeenCalled()
		expect(prisma.leadFormSubmission.create).not.toHaveBeenCalled()
	})
})
