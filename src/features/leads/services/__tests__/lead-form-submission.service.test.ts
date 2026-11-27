import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import {
	ingestLeadFormSubmission,
	LeadFormSubmissionError,
} from '@/features/leads/services/lead-form-submission.service'
import {
	collectPersonGroupIds,
	findPersonContactIds,
	resolvePersonGroupOwner,
	propagatePersonGroupOwner,
} from '@/features/leads/services/lead-person-group.service'
import { validateLeadCapture } from '@/features/leads/captures/lead-capture.service'
import type { FormSubmissionPayload } from '@/features/leads/types/form-submission.schema'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: vi.fn(),
		$executeRaw: vi.fn(),
		leadFormSubmission: { findUnique: vi.fn(), create: vi.fn() },
		lead: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
			create: vi.fn(),
		},
		leadLink: { createMany: vi.fn() },
		leadChangeHistory: { createMany: vi.fn() },
		leadFunnelColumn: { findFirst: vi.fn() },
		user: { findFirst: vi.fn() },
		leadStageHistory: { create: vi.fn() },
		clientOrigin: { findMany: vi.fn(), create: vi.fn() },
		leadClientOrigin: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
	},
}))

vi.mock('@/features/leads/services/lead-person-group.service', () => ({
	findPersonContactIds: vi.fn(),
	collectPersonGroupIds: vi.fn(),
	resolvePersonGroupOwner: vi.fn(),
	propagatePersonGroupOwner: vi.fn(),
}))
vi.mock('@/features/leads/captures/lead-capture.service', () => ({
	validateLeadCapture: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		LEAD_CREATED: 'LEAD_CREATED',
		LEAD_OWNER_UNRESOLVED: 'LEAD_OWNER_UNRESOLVED',
		LEAD_FORM_SUBMISSION_STORED: 'LEAD_FORM_SUBMISSION_STORED',
		LEAD_ORIGIN_CREATED: 'LEAD_ORIGIN_CREATED',
		LEAD_ORIGIN_ASSIGNED: 'LEAD_ORIGIN_ASSIGNED',
		LEAD_ORIGIN_INACTIVE: 'LEAD_ORIGIN_INACTIVE',
	},
}))

const payload: FormSubmissionPayload = {
	submissionId: 'credito-libre:9f3c1a',
	submittedAt: new Date('2026-11-18T18:44:00.000Z'),
	landing: {
		key: 'credito-libre',
		name: 'Crédito libre inversión',
		version: '3',
	},
	lead: {
		statusKey: 'nuevo',
		name: 'Ana',
		lastName: 'Pérez',
		email: 'ana@correo.com',
		phone: '3001234567',
		identityNumber: '1234567890',
		originTag: 'Crédito libre inversión',
		ownerEmail: undefined,
		referrerName: undefined,
	},
	fields: [
		{ key: 'monto', label: 'Monto solicitado', type: 'number', value: 0 },
	],
}

describe('ingestLeadFormSubmission', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(findPersonContactIds).mockResolvedValue([])
		vi.mocked(collectPersonGroupIds).mockImplementation(async (ids) => [...ids])
		vi.mocked(resolvePersonGroupOwner).mockImplementation(
			async (_db, _ids, opts) => opts.targetOwnerId ?? null
		)
		vi.mocked(validateLeadCapture).mockResolvedValue(undefined)
		vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)
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

	it('creates another active opportunity for a different capture and propagates the trusted owner', async () => {
		vi.mocked(findPersonContactIds).mockResolvedValue([15])
		vi.mocked(collectPersonGroupIds).mockResolvedValue([15, 16])
		vi.mocked(resolvePersonGroupOwner).mockResolvedValue(8)
		await ingestLeadFormSubmission({
			...payload,
			lead: { ...payload.lead, idLeadCapture: 2, referrerName: 'Ana' },
		})
		expect(prisma.lead.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					idLeadCapture: 2,
					referrerName: 'Ana',
					active: true,
					idUser: 8,
				}),
			})
		)
		expect(prisma.leadLink.createMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({ idRelatedLead: 15 }),
					expect.objectContaining({ idRelatedLead: 16 }),
				]),
			})
		)
		expect(resolvePersonGroupOwner).toHaveBeenCalledWith(prisma, [15, 16], {
			manageableUserIds: [],
		})
		expect(propagatePersonGroupOwner).toHaveBeenCalledWith(
			prisma,
			[15, 16],
			8,
			{ source: 'SYSTEM' },
			payload.submittedAt
		)
	})
	it('reuses a capture in the same explicit group without overwriting attribution', async () => {
		vi.mocked(findPersonContactIds).mockResolvedValue([15, 16])
		vi.mocked(collectPersonGroupIds).mockResolvedValue([15, 16])
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({ idLead: 16 } as never)
		vi.mocked(prisma.lead.findUnique).mockResolvedValue({
			idLead: 16,
			idLeadCapture: 2,
			referrerName: 'First',
			originTag: 'First source',
		} as never)
		const result = await ingestLeadFormSubmission({
			...payload,
			lead: { ...payload.lead, idLeadCapture: 2, referrerName: 'Later' },
		})
		expect(result).toMatchObject({ idLead: 16, created: false })
		expect(prisma.lead.create).not.toHaveBeenCalled()
		expect(prisma.lead.update).not.toHaveBeenCalled()
	})
	it('rejects capture matches in unrelated components before writes', async () => {
		vi.mocked(findPersonContactIds).mockResolvedValue([15, 16])
		vi.mocked(collectPersonGroupIds).mockResolvedValue([15])
		await expect(
			ingestLeadFormSubmission({
				...payload,
				lead: { ...payload.lead, idLeadCapture: 2 },
			})
		).rejects.toBeInstanceOf(LeadFormSubmissionError)
		expect(prisma.lead.create).not.toHaveBeenCalled()
		expect(prisma.leadFormSubmission.create).not.toHaveBeenCalled()
	})
	it('does not store the submission when capture validation fails', async () => {
		vi.mocked(validateLeadCapture).mockRejectedValueOnce(new Error('inactive'))
		await expect(
			ingestLeadFormSubmission({
				...payload,
				lead: { ...payload.lead, idLeadCapture: 2 },
			})
		).rejects.toThrow('inactive')
		expect(prisma.leadFormSubmission.create).not.toHaveBeenCalled()
	})
	it('propagates an explicit trusted owner to the reused group', async () => {
		vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([
			{ idLead: 15 },
		] as never)
		vi.mocked(prisma.user.findFirst).mockResolvedValue({
			idUser: 9,
			name: 'Advisor',
		} as never)
		await ingestLeadFormSubmission({
			...payload,
			lead: { ...payload.lead, ownerEmail: 'advisor@example.com' },
		})
		expect(resolvePersonGroupOwner).toHaveBeenCalledWith(prisma, [15], {
			manageableUserIds: [],
			targetOwnerId: 9,
		})
		expect(propagatePersonGroupOwner).toHaveBeenCalledWith(
			prisma,
			[15],
			9,
			{ source: 'SYSTEM' },
			payload.submittedAt
		)
	})
	it('returns a conflict on concurrent group modification without storing a submission', async () => {
		vi.mocked(prisma.$transaction).mockRejectedValueOnce(
			new Prisma.PrismaClientKnownRequestError('serialization', {
				code: 'P2034',
				clientVersion: 'test',
			})
		)
		await expect(ingestLeadFormSubmission(payload)).rejects.toMatchObject({
			code: 'GROUP_CONFLICT',
		})
		expect(prisma.leadFormSubmission.create).not.toHaveBeenCalled()
	})
	it('writes origin provenance inside the snapshot transaction and rejects failed snapshots', async () => {
		vi.mocked(prisma.clientOrigin.findMany).mockResolvedValue([
			{ idClientOrigin: 4, name: 'Money Map', status: true },
		] as never)
		vi.mocked(prisma.leadClientOrigin.findUnique).mockResolvedValueOnce(null)
		vi.mocked(prisma.leadFormSubmission.create).mockRejectedValueOnce(
			new Error('snapshot failed')
		)
		await expect(
			ingestLeadFormSubmission({ ...payload, utm_source: 'Money Map' })
		).rejects.toThrow('snapshot failed')
		expect(prisma.leadChangeHistory.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					idLead: 21,
					kind: 'ORIGIN',
					source: 'SYSTEM',
					toLabel: 'Money Map',
				}),
			],
		})
		expect(
			vi.mocked(prisma.leadChangeHistory.createMany).mock.invocationCallOrder[0]
		).toBeLessThan(
			vi.mocked(prisma.leadFormSubmission.create).mock.invocationCallOrder[0]
		)
		expect(logAuditEvent).not.toHaveBeenCalled()
	})
	it('replays a known submission without writing', async () => {
		vi.mocked(prisma.leadFormSubmission.findUnique).mockResolvedValue({
			idLead: 8,
		} as never)

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
		vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([
			{ idLead: 15 },
		] as never)

		await expect(ingestLeadFormSubmission(payload)).resolves.toEqual({
			idLead: 15,
			created: false,
			replayed: false,
		})
		expect(prisma.lead.create).not.toHaveBeenCalled()
		expect(prisma.leadFormSubmission.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					idLead: 15,
					submissionId: payload.submissionId,
				}),
			})
		)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.LEAD_FORM_SUBMISSION_STORED,
			})
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
			expect.objectContaining({
				data: expect.objectContaining({ source: 'LANDING_FORM', idLead: 21 }),
			})
		)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.LEAD_CREATED })
		)
	})

	it('refuses an ambiguous match before any write', async () => {
		vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([
			{ idLead: 1 },
			{ idLead: 2 },
		] as never)

		await expect(ingestLeadFormSubmission(payload)).rejects.toBeInstanceOf(
			LeadFormSubmissionError
		)
		expect(prisma.lead.create).not.toHaveBeenCalled()
		expect(prisma.leadFormSubmission.create).not.toHaveBeenCalled()
	})

	it('locks all matching identities in a stable order before reading the lead', async () => {
		await ingestLeadFormSubmission({
			...payload,
			lead: { ...payload.lead, email: 'ANA@CORREO.COM' },
		})

		expect(
			vi.mocked(prisma.$executeRaw).mock.calls.map(([, key]) => key)
		).toEqual([
			'lead-form:document:1234567890',
			'lead-form:email:ana@correo.com',
			'lead-form:phone:3001234567',
		])
		expect(
			vi.mocked(prisma.$executeRaw).mock.invocationCallOrder.at(-1)
		).toBeLessThan(vi.mocked(prisma.lead.findMany).mock.invocationCallOrder[0])
		expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
			isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
		})
	})

	it('matches email wildcard characters literally while locking the unescaped identity', async () => {
		vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([
			{ idLead: 15 },
		] as never)
		await ingestLeadFormSubmission({
			...payload,
			lead: {
				...payload.lead,
				identityNumber: undefined,
				phone: undefined,
				email: 'ana_%@correo.com',
			},
		})

		expect(prisma.lead.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					active: true,
					email: {
						equals: String.raw`ana\_\%@correo.com`,
						mode: 'insensitive',
					},
				},
			})
		)
		expect(vi.mocked(prisma.$executeRaw).mock.calls[0][1]).toBe(
			'lead-form:email:ana_%@correo.com'
		)
		expect(prisma.lead.create).not.toHaveBeenCalled()
	})

	it('returns the stored result when the same submission wins a concurrent unique insert', async () => {
		vi.mocked(prisma.$transaction).mockRejectedValueOnce(
			new Prisma.PrismaClientKnownRequestError('Unique submission', {
				code: 'P2002',
				clientVersion: '6',
			})
		)
		vi.mocked(prisma.leadFormSubmission.findUnique).mockResolvedValue({
			idLead: 8,
		} as never)

		await expect(ingestLeadFormSubmission(payload)).resolves.toEqual({
			idLead: 8,
			created: false,
			replayed: true,
		})
		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})

describe('form origin transaction', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(findPersonContactIds).mockResolvedValue([])
		vi.mocked(collectPersonGroupIds).mockImplementation(async (ids) => [...ids])
		vi.mocked(resolvePersonGroupOwner).mockImplementation(
			async (_db, _ids, opts) => opts.targetOwnerId ?? null
		)
		vi.mocked(validateLeadCapture).mockResolvedValue(undefined)
		vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			if (typeof callback === 'function') return callback(prisma as never)
		})
		vi.mocked(prisma.leadFormSubmission.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.lead.findMany).mockResolvedValue([{ idLead: 15 }] as never)
		vi.mocked(prisma.clientOrigin.findMany).mockResolvedValue([
			{ idClientOrigin: 4, name: 'Money Map', status: true },
		] as never)
		vi.mocked(prisma.leadClientOrigin.findUnique).mockResolvedValue(null)
	})

	it('stores the origin and canonical snapshot together for an existing lead', async () => {
		await ingestLeadFormSubmission({ ...payload, utm_source: 'money_map' })
		expect(prisma.leadClientOrigin.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ idLead: 15, idClientOrigin: 4 }),
			})
		)
		expect(prisma.leadFormSubmission.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ idLead: 15, formVersion: '3' }),
			})
		)
		expect(prisma.lead.create).not.toHaveBeenCalled()
	})

	it('does not commit a snapshot or audit success when assigning its origin fails', async () => {
		vi.mocked(prisma.leadClientOrigin.create).mockRejectedValueOnce(
			new Error('origin failed')
		)
		await expect(
			ingestLeadFormSubmission({ ...payload, utm_source: 'money_map' })
		).rejects.toThrow('origin failed')
		expect(prisma.leadFormSubmission.create).not.toHaveBeenCalled()
		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})
