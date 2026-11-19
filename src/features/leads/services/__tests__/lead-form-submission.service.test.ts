import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { ingestLeadFormSubmission } from '@/features/leads/services/lead-form-submission.service'
import { recordLeadStageChange } from '@/features/leads/services/lead-stage-history.service'
import type { FormSubmissionPayload } from '@/features/leads/types/form-submission.schema'

vi.mock('@/lib/prisma', () => {
	const client = {
		leadFormSubmission: { findUnique: vi.fn(), create: vi.fn() },
		lead: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
		leadOrigin: { findUnique: vi.fn(), create: vi.fn() },
		leadOriginAssignment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
		leadFunnelColumn: { findFirst: vi.fn() },
		user: { findFirst: vi.fn() },
		$transaction: vi.fn(),
	}
	client.$transaction.mockImplementation(async (fn: (tx: typeof client) => unknown) => fn(client))
	return { prisma: client }
})

vi.mock('@/features/leads/services/lead-stage-history.service', () => ({
	recordLeadStageChange: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		LEAD_CREATED: 'LEAD_CREATED',
		LEAD_FORM_SUBMISSION_RECORDED: 'LEAD_FORM_SUBMISSION_RECORDED',
		LEAD_ORIGIN_CREATED: 'LEAD_ORIGIN_CREATED',
		LEAD_ORIGIN_ASSIGNED: 'LEAD_ORIGIN_ASSIGNED',
		LEAD_ORIGIN_INACTIVE: 'LEAD_ORIGIN_INACTIVE',
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
		ownerEmail: 'asesor@financieramente.com',
	},
	fields: [
		{ key: 'monto', label: 'Monto solicitado', type: 'number', value: 0 },
		{ key: 'tiene_codeudor', label: '¿Tiene codeudor?', type: 'select', value: 'No' },
	],
}

describe('ingestLeadFormSubmission', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
			(fn as (tx: typeof prisma) => Promise<unknown>)(prisma)
		)
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue({
			idLeadFunnelColumn: 2,
			externalStatusKey: 'NUEVO',
		} as never)
		vi.mocked(prisma.user.findFirst).mockResolvedValue({ idUser: 9 } as never)
		vi.mocked(prisma.leadFormSubmission.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.lead.create).mockResolvedValue({ idLead: 20 } as never)
	})

	it('returns the original lead when submissionId was already stored', async () => {
		vi.mocked(prisma.leadFormSubmission.findUnique).mockResolvedValue({
			idLead: 4,
			submissionId: payload.submissionId,
		} as never)

		const result = await ingestLeadFormSubmission(payload)

		expect(result).toEqual({ idLead: 4, created: false, submissionId: payload.submissionId })
		expect(prisma.$transaction).not.toHaveBeenCalled()
		expect(prisma.lead.create).not.toHaveBeenCalled()
	})

	it('creates the lead and the snapshot together when the person is new', async () => {
		const result = await ingestLeadFormSubmission(payload)

		expect(result).toEqual({ idLead: 20, created: true, submissionId: payload.submissionId })
		expect(prisma.lead.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					originTag: 'Crédito libre inversión',
					idUser: 9,
					idLeadFunnelColumn: 2,
				}),
			})
		)
		expect(prisma.lead.update).not.toHaveBeenCalled()
		expect(prisma.leadFormSubmission.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					idLead: 20,
					fields: payload.fields,
				}),
			})
		)
		expect(recordLeadStageChange).toHaveBeenCalled()
		expect(logAuditEvent).toHaveBeenCalled()
	})

	it('adds only the snapshot when the document or email already belongs to a lead', async () => {
		vi.mocked(prisma.lead.findFirst)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ idLead: 8 } as never)

		const result = await ingestLeadFormSubmission(payload)

		expect(result).toEqual({ idLead: 8, created: false, submissionId: payload.submissionId })
		expect(prisma.lead.create).not.toHaveBeenCalled()
		expect(prisma.lead.update).not.toHaveBeenCalled()
		expect(recordLeadStageChange).not.toHaveBeenCalled()
		expect(prisma.leadFormSubmission.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ idLead: 8 }) })
		)
	})

	it('labels a new lead with utm_source and links the origin pivot', async () => {
		vi.mocked(prisma.leadOrigin.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.leadOrigin.create).mockResolvedValue({
			idLeadOrigin: 4,
			code: 'money_map',
			name: 'Money Map',
			status: true,
		} as never)
		vi.mocked(prisma.leadOriginAssignment.findUnique).mockResolvedValue(null)

		await ingestLeadFormSubmission({ ...payload, utm_source: 'Money Map' })

		expect(prisma.lead.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ originTag: 'Money Map' }),
			})
		)
		expect(prisma.leadOriginAssignment.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ idLead: 20, idLeadOrigin: 4, active: true }),
			})
		)
	})

	it('links utm_source on an existing lead without rewriting the lead', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({ idLead: 8 } as never)
		vi.mocked(prisma.leadOrigin.findUnique).mockResolvedValue({
			idLeadOrigin: 4,
			code: 'money_map',
			name: 'Money Map',
			status: true,
		} as never)
		vi.mocked(prisma.leadOriginAssignment.findUnique).mockResolvedValue(null)

		await ingestLeadFormSubmission({ ...payload, utm_source: 'Money Map' })

		expect(prisma.lead.create).not.toHaveBeenCalled()
		expect(prisma.lead.update).not.toHaveBeenCalled()
		expect(prisma.leadOriginAssignment.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ idLead: 8, idLeadOrigin: 4 }),
			})
		)
	})
})
