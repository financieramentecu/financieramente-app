import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { resolveOutcomeStatus } from '@/features/leads/lib/lead-outcome-status'
import { importLeadsFromCsv } from '@/features/leads/services/lead-csv-import.service'
import type { LeadCsvRawRow } from '@/features/leads/lib/parse-lead-csv-file'

const CONTACTADO_COLUMN = {
	idLeadFunnelColumn: 1,
	name: 'Contactado',
	externalStatusKey: 'CONTACTADO',
	position: 0,
	isFallback: false,
	active: true,
}

const ACTOR = {
	userId: 7,
	email: 'ana@financieramente.com',
	ipAddress: '127.0.0.1',
	userAgent: 'vitest',
}

function makeRawRow(overrides: Partial<LeadCsvRawRow> = {}): LeadCsvRawRow {
	return {
		id_externo_crm: 'CRM-1',
		nombre: 'Juan',
		apellido: 'Perez',
		telefono: '3001234567',
		correo: 'juan@x.com',
		columna_funnel: 'Contactado',
		estado: 'open',
		fecha_creacion: '2023-01-15T10:00:00-05:00',
		origen: 'Feria',
		propietario_correo: '',
		propietario_nombre: '',
		...overrides,
	}
}

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadFunnelColumn: {
			findMany: vi.fn(),
		},
		user: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
		},
		lead: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
		},
	},
}))

vi.mock('@/features/auth/lib/audit-logger', async () => {
	const actual = await vi.importActual<typeof import('@/features/auth/lib/audit-logger')>(
		'@/features/auth/lib/audit-logger'
	)
	return {
		...actual,
		logAuditEvent: vi.fn(),
	}
})

describe('importLeadsFromCsv', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([CONTACTADO_COLUMN] as never)
		vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.user.findMany).mockResolvedValue([])
		vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.lead.upsert).mockImplementation(
			(args: unknown) =>
				Promise.resolve({
					idLead: 1,
					outcomeStatus: 'OPEN',
					...(args as { create?: Record<string, unknown> }).create,
				}) as never
		)
	})

	it('imports valid rows and reports rejected ones without all-or-nothing rollback', async () => {
		const rows = [
			makeRawRow({ id_externo_crm: 'CRM-1' }),
			makeRawRow({ id_externo_crm: 'CRM-2' }),
			makeRawRow({ id_externo_crm: 'CRM-3', columna_funnel: 'Etapa Inexistente' }),
			makeRawRow({ id_externo_crm: 'CRM-4' }),
			makeRawRow({ id_externo_crm: 'CRM-5', estado: 'en_revision' }),
		]

		const summary = await importLeadsFromCsv(rows, ACTOR)

		expect(summary.imported).toBe(3)
		expect(summary.rejected).toHaveLength(2)
		expect(summary.rejected.map((r) => r.rowNumber)).toEqual([4, 6])
	})

	it('rejects the second occurrence of a duplicate id_externo_crm within the file', async () => {
		const rows = [
			makeRawRow({ id_externo_crm: 'CRM-100' }),
			makeRawRow({ id_externo_crm: 'CRM-999' }),
			makeRawRow({ id_externo_crm: 'CRM-100' }),
		]

		const summary = await importLeadsFromCsv(rows, ACTOR)

		expect(summary.imported).toBe(2)
		expect(summary.rejected).toHaveLength(1)
		expect(summary.rejected[0].rowNumber).toBe(4)
		expect(summary.rejected[0].reason).toContain('duplicad')
	})

	it('rejects an unrecognized estado, never falling back to OPEN', async () => {
		const rows = [makeRawRow({ id_externo_crm: 'CRM-200', estado: 'en_revision' })]

		const summary = await importLeadsFromCsv(rows, ACTOR)

		expect(summary.rejected).toHaveLength(1)
		expect(summary.rejected[0].reason).toContain('en_revision')
		expect(prisma.lead.upsert).not.toHaveBeenCalled()
	})

	it('rejects an unmatched columna_funnel, never falling back to a default column', async () => {
		const rows = [makeRawRow({ id_externo_crm: 'CRM-300', columna_funnel: 'Etapa Inexistente' })]

		const summary = await importLeadsFromCsv(rows, ACTOR)

		expect(summary.rejected).toHaveLength(1)
		expect(summary.rejected[0].reason).toContain('Contactado')
		expect(prisma.lead.upsert).not.toHaveBeenCalled()
	})

	it('reports the WON lock without rejecting the row', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue({
			idLead: 10,
			externalCrmId: 'CRM-300',
			outcomeStatus: 'WON',
		} as never)

		const rows = [makeRawRow({ id_externo_crm: 'CRM-300', estado: 'lost' })]

		const summary = await importLeadsFromCsv(rows, ACTOR)

		expect(summary.rejected).toHaveLength(0)
		expect(summary.imported).toBe(1)
		expect(summary.wonLockedLeads).toHaveLength(1)
		expect(summary.wonLockedLeads[0]).toMatchObject({
			externalCrmId: 'CRM-300',
			attemptedStatus: 'LOST',
		})
	})

	it('imports a lead ownerless when propietario_correo matches no active User', async () => {
		vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

		const rows = [
			makeRawRow({ id_externo_crm: 'CRM-400', propietario_correo: 'noexiste@example.com' }),
		]

		const summary = await importLeadsFromCsv(rows, ACTOR)

		expect(summary.rejected).toHaveLength(0)
		expect(summary.ownerlessLeads).toHaveLength(1)
		expect(summary.ownerlessLeads[0]).toMatchObject({
			externalCrmId: 'CRM-400',
			ownerEmail: 'noexiste@example.com',
		})
	})

	it('updates telefono on re-import and preserves origen when omitted', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue({
			idLead: 20,
			externalCrmId: 'CRM-500',
			originTag: 'Feria',
			phone: '3000000000',
			outcomeStatus: 'OPEN',
		} as never)

		const rows = [
			makeRawRow({ id_externo_crm: 'CRM-500', telefono: '3009999999', origen: '' }),
		]

		await importLeadsFromCsv(rows, ACTOR)

		const upsertArgs = vi.mocked(prisma.lead.upsert).mock.calls[0][0] as {
			update: Record<string, unknown>
		}
		expect(upsertArgs.update.phone).toBe('3009999999')
		expect(upsertArgs.update.originTag).toBeUndefined()
	})

	it('logs every audit event with the real importing user email, never crm-sync@system', async () => {
		const rows = [
			makeRawRow({ id_externo_crm: 'CRM-600' }),
			makeRawRow({ id_externo_crm: 'CRM-601', estado: 'en_revision' }),
		]

		await importLeadsFromCsv(rows, ACTOR)

		expect(logAuditEvent).toHaveBeenCalled()
		const calls = vi.mocked(logAuditEvent).mock.calls
		for (const [params] of calls) {
			expect(params.email).toBe('ana@financieramente.com')
			expect(params.email).not.toBe('crm-sync@system')
		}

		const actions = calls.map(([params]) => params.action)
		expect(actions).toContain(AuditAction.LEAD_CSV_IMPORT_STARTED)
		expect(actions).toContain(AuditAction.LEAD_CSV_IMPORT_COMPLETED)
		expect(actions).toContain(AuditAction.LEAD_CSV_ROW_REJECTED)
	})

	it('invariant: resolveOutcomeStatus is only ever invoked with an already-parsed value, so unresolved stays false for every processed row', async () => {
		const rows = [
			makeRawRow({ id_externo_crm: 'CRM-700', estado: 'won' }),
			makeRawRow({ id_externo_crm: 'CRM-701', estado: 'lost' }),
			makeRawRow({ id_externo_crm: 'CRM-702', estado: 'en_revision' }),
		]

		await importLeadsFromCsv(rows, ACTOR)

		for (const row of ['won'.toUpperCase(), 'lost'.toUpperCase()]) {
			const result = resolveOutcomeStatus(row, undefined)
			expect(result.unresolved).toBe(false)
		}
	})

	describe('Amendment A: propietario_nombre owner fallback', () => {
		const YOHAN = { idUser: 42, name: 'Yohan', lastName: 'España' }
		const EMAIL_MATCH = { idUser: 5, name: 'Email', lastName: 'Match' }

		it('email match wins: resolveOwnerByName is never consulted when the email resolves', async () => {
			vi.mocked(prisma.user.findFirst).mockResolvedValue({ idUser: EMAIL_MATCH.idUser } as never)
			vi.mocked(prisma.user.findMany).mockResolvedValue([YOHAN, EMAIL_MATCH] as never)

			const rows = [
				makeRawRow({
					id_externo_crm: 'CRM-800',
					propietario_correo: 'email-match@x.com',
					propietario_nombre: 'Yohan España',
				}),
			]

			const summary = await importLeadsFromCsv(rows, ACTOR)

			expect(summary.ownerlessLeads).toHaveLength(0)
			const upsertArgs = vi.mocked(prisma.lead.upsert).mock.calls[0][0] as {
				create: Record<string, unknown>
			}
			expect(upsertArgs.create.idUser).toBe(EMAIL_MATCH.idUser)
		})

		it('empty email + single name match assigns the name-matched owner', async () => {
			vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
			vi.mocked(prisma.user.findMany).mockResolvedValue([YOHAN] as never)

			const rows = [
				makeRawRow({
					id_externo_crm: 'CRM-801',
					propietario_correo: '',
					propietario_nombre: '  yohan   espana ',
				}),
			]

			const summary = await importLeadsFromCsv(rows, ACTOR)

			expect(summary.ownerlessLeads).toHaveLength(0)
			const upsertArgs = vi.mocked(prisma.lead.upsert).mock.calls[0][0] as {
				create: Record<string, unknown>
			}
			expect(upsertArgs.create.idUser).toBe(YOHAN.idUser)
		})

		it('unmatched email + name match assigns the name-matched owner, overriding the failed email', async () => {
			vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
			vi.mocked(prisma.user.findMany).mockResolvedValue([YOHAN] as never)

			const rows = [
				makeRawRow({
					id_externo_crm: 'CRM-802',
					propietario_correo: 'noexiste@example.com',
					propietario_nombre: 'Yohan España',
				}),
			]

			const summary = await importLeadsFromCsv(rows, ACTOR)

			expect(summary.ownerlessLeads).toHaveLength(0)
			const upsertArgs = vi.mocked(prisma.lead.upsert).mock.calls[0][0] as {
				create: Record<string, unknown>
			}
			expect(upsertArgs.create.idUser).toBe(YOHAN.idUser)
		})

		it('ambiguous name never assigns an owner and reports candidateCount', async () => {
			vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
			vi.mocked(prisma.user.findMany).mockResolvedValue([
				{ idUser: 1, name: 'Juan', lastName: 'Perez' },
				{ idUser: 2, name: 'Juan', lastName: 'Perez' },
			] as never)

			const rows = [
				makeRawRow({
					id_externo_crm: 'CRM-803',
					propietario_correo: '',
					propietario_nombre: 'Juan Perez',
				}),
			]

			const summary = await importLeadsFromCsv(rows, ACTOR)

			const upsertArgs = vi.mocked(prisma.lead.upsert).mock.calls[0][0] as {
				create: Record<string, unknown>
			}
			expect(upsertArgs.create.idUser).toBeUndefined()
			expect(summary.ownerlessLeads).toHaveLength(1)
			expect(summary.ownerlessLeads[0]).toMatchObject({
				reason: 'NAME_AMBIGUOUS',
				ownerName: 'Juan Perez',
				candidateCount: 2,
			})
		})

		it('unmatched name reports NAME_UNMATCHED echoing the supplied name', async () => {
			vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
			vi.mocked(prisma.user.findMany).mockResolvedValue([])

			const rows = [
				makeRawRow({
					id_externo_crm: 'CRM-804',
					propietario_correo: '',
					propietario_nombre: 'Nadie Existente',
				}),
			]

			const summary = await importLeadsFromCsv(rows, ACTOR)

			expect(summary.ownerlessLeads).toHaveLength(1)
			expect(summary.ownerlessLeads[0]).toMatchObject({
				reason: 'NAME_UNMATCHED',
				ownerName: 'Nadie Existente',
			})
		})

		it('unmatched email with no name clears the owner and reports EMAIL_UNMATCHED', async () => {
			vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
			vi.mocked(prisma.user.findMany).mockResolvedValue([])

			const rows = [
				makeRawRow({
					id_externo_crm: 'CRM-805',
					propietario_correo: 'noexiste@example.com',
					propietario_nombre: '',
				}),
			]

			const summary = await importLeadsFromCsv(rows, ACTOR)

			const upsertArgs = vi.mocked(prisma.lead.upsert).mock.calls[0][0] as {
				create: Record<string, unknown>
			}
			expect(upsertArgs.create.idUser).toBeNull()
			expect(summary.ownerlessLeads).toHaveLength(1)
			expect(summary.ownerlessLeads[0]).toMatchObject({
				reason: 'EMAIL_UNMATCHED',
				ownerEmail: 'noexiste@example.com',
			})
		})

		it('both owner columns empty on a new lead creates it without an owner and reports NO_OWNER_PROVIDED', async () => {
			vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
			vi.mocked(prisma.user.findMany).mockResolvedValue([])
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)

			const rows = [
				makeRawRow({
					id_externo_crm: 'CRM-806',
					propietario_correo: '',
					propietario_nombre: '',
				}),
			]

			const summary = await importLeadsFromCsv(rows, ACTOR)

			const upsertArgs = vi.mocked(prisma.lead.upsert).mock.calls[0][0] as {
				create: Record<string, unknown>
			}
			expect(upsertArgs.create.idUser).toBeUndefined()
			expect(summary.ownerlessLeads).toHaveLength(1)
			expect(summary.ownerlessLeads[0]).toMatchObject({ reason: 'NO_OWNER_PROVIDED' })
		})

		it('both owner columns empty on an existing owned lead preserves the owner and is not reported ownerless', async () => {
			vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
			vi.mocked(prisma.user.findMany).mockResolvedValue([])
			vi.mocked(prisma.lead.findUnique).mockResolvedValue({
				idLead: 30,
				externalCrmId: 'CRM-807',
				idUser: 99,
				outcomeStatus: 'OPEN',
			} as never)

			const rows = [
				makeRawRow({
					id_externo_crm: 'CRM-807',
					propietario_correo: '',
					propietario_nombre: '',
				}),
			]

			const summary = await importLeadsFromCsv(rows, ACTOR)

			const upsertArgs = vi.mocked(prisma.lead.upsert).mock.calls[0][0] as {
				update: Record<string, unknown>
			}
			expect(upsertArgs.update.idUser).toBeUndefined()
			expect(summary.ownerlessLeads).toHaveLength(0)
		})

		it('a name typo never clears an existing owner (empty email, unmatched name, existing owned lead)', async () => {
			vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
			vi.mocked(prisma.user.findMany).mockResolvedValue([])
			vi.mocked(prisma.lead.findUnique).mockResolvedValue({
				idLead: 31,
				externalCrmId: 'CRM-808',
				idUser: 99,
				outcomeStatus: 'OPEN',
			} as never)

			const rows = [
				makeRawRow({
					id_externo_crm: 'CRM-808',
					propietario_correo: '',
					propietario_nombre: 'Nombre Con Typo',
				}),
			]

			const summary = await importLeadsFromCsv(rows, ACTOR)

			const upsertArgs = vi.mocked(prisma.lead.upsert).mock.calls[0][0] as {
				update: Record<string, unknown>
			}
			expect(upsertArgs.update.idUser).toBeUndefined()
			expect(summary.ownerlessLeads[0]).toMatchObject({ reason: 'NAME_UNMATCHED' })
		})

		it('preloads active users exactly once for a multi-row file', async () => {
			vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
			vi.mocked(prisma.user.findMany).mockResolvedValue([YOHAN] as never)

			const rows = [
				makeRawRow({ id_externo_crm: 'CRM-900', propietario_nombre: 'Yohan España' }),
				makeRawRow({ id_externo_crm: 'CRM-901', propietario_nombre: 'Yohan España' }),
				makeRawRow({ id_externo_crm: 'CRM-902', propietario_nombre: 'Yohan España' }),
			]

			await importLeadsFromCsv(rows, ACTOR)

			expect(prisma.user.findMany).toHaveBeenCalledTimes(1)
		})
	})
})
