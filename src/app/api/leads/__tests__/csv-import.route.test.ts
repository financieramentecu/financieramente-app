import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../leads/csv-import/route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { importLeadsFromCsv } from '@/features/leads/services/lead-csv-import.service'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/leads/services/lead-csv-import.service', () => ({
	importLeadsFromCsv: vi.fn(),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

function buildRequest(body: unknown) {
	return new Request('http://localhost:3000/api/leads/csv-import', {
		method: 'POST',
		body: JSON.stringify(body),
	})
}

const SUMMARY = {
	totalRows: 1,
	imported: 0,
	created: 0,
	updated: 0,
	rejected: [{ rowNumber: 2, reason: 'x' }],
	ownerlessLeads: [],
	wonLockedLeads: [],
}

describe('POST /api/leads/csv-import', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns 401 when there is no session', async () => {
		vi.mocked(auth).mockResolvedValue(null)

		const response = await POST(buildRequest({ rows: [] }))
		expect(response.status).toBe(401)
	})

	it('returns 403 for a role other than ADMIN/ASISTENTE_GERENCIA_OPERATIVA', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'agent@x.com' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 2,
			role: { code: 'AGENTE' },
		} as never)

		const response = await POST(buildRequest({ rows: [] }))
		expect(response.status).toBe(403)
		expect(importLeadsFromCsv).not.toHaveBeenCalled()
	})

	it('returns 400 for a malformed body', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'admin@x.com', id: '1' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			role: { code: 'ADMIN' },
		} as never)

		const response = await POST(buildRequest({ notRows: true }))
		expect(response.status).toBe(400)
	})

	it('returns 200 with an all-rejected summary for a mixed-validity payload', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'admin@x.com', id: '1' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			role: { code: 'ADMIN' },
		} as never)
		vi.mocked(importLeadsFromCsv).mockResolvedValue(SUMMARY as never)

		const response = await POST(buildRequest({ rows: [{ id_externo_crm: 'CRM-1' }] }))
		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.data).toEqual(SUMMARY)
	})

	it('allows ASISTENTE_GERENCIA_OPERATIVA and delegates to importLeadsFromCsv with the real actor', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'asistente@x.com', id: '3' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 3,
			role: { code: 'ASISTENTE_GERENCIA_OPERATIVA' },
		} as never)
		vi.mocked(importLeadsFromCsv).mockResolvedValue(SUMMARY as never)

		const response = await POST(buildRequest({ rows: [{ id_externo_crm: 'CRM-1' }] }))
		expect(response.status).toBe(200)
		expect(importLeadsFromCsv).toHaveBeenCalledWith(
			[{ id_externo_crm: 'CRM-1' }],
			expect.objectContaining({ email: 'asistente@x.com' })
		)
	})

	it('round-trips a propietario_nombre row and serializes a reasoned ownerless entry, including candidateCount when ambiguous', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'admin@x.com', id: '1' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			role: { code: 'ADMIN' },
		} as never)
		const summaryWithOwnerlessReason = {
			totalRows: 1,
			imported: 1,
			created: 1,
			updated: 0,
			rejected: [],
			ownerlessLeads: [
				{
					rowNumber: 2,
					externalCrmId: 'CRM-1',
					reason: 'NAME_AMBIGUOUS',
					ownerName: 'Juan Perez',
					candidateCount: 2,
				},
			],
			wonLockedLeads: [],
		}
		vi.mocked(importLeadsFromCsv).mockResolvedValue(summaryWithOwnerlessReason as never)

		const response = await POST(
			buildRequest({ rows: [{ id_externo_crm: 'CRM-1', propietario_nombre: 'Juan Perez' }] })
		)
		expect(response.status).toBe(200)
		expect(importLeadsFromCsv).toHaveBeenCalledWith(
			[{ id_externo_crm: 'CRM-1', propietario_nombre: 'Juan Perez' }],
			expect.objectContaining({ email: 'admin@x.com' })
		)
		const body = await response.json()
		expect(body.data.ownerlessLeads[0]).toEqual(
			expect.objectContaining({
				reason: 'NAME_AMBIGUOUS',
				ownerName: 'Juan Perez',
				candidateCount: 2,
			})
		)
	})
})
