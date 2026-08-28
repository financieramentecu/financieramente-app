import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/features/auth/lib/roles'
import { prisma } from '@/lib/prisma'
import { EXPORT_MAX_ROWS } from '@/features/negocios/lib/export-limits'
import type { BusinessExportPayload } from '@/features/negocios/lib/business-export-include'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			count: vi.fn(),
			findMany: vi.fn(),
		},
		user: {
			findUnique: vi.fn(),
		},
	},
}))

vi.mock('next/server', () => ({
	NextResponse: class MockNextResponse {
		body: unknown
		init?: { headers?: Record<string, string>; status?: number }

		constructor(
			body: unknown,
			init?: { headers?: Record<string, string>; status?: number }
		) {
			this.body = body
			this.init = init
		}

		get status() {
			return this.init?.status ?? 200
		}

		headers = {
			get: (name: string) => {
				const h = this.init?.headers
				if (!h) return null
				const found = Object.keys(h).find(
					(k) => k.toLowerCase() === name.toLowerCase()
				)
				return found ? h[found] : null
			},
		}

		async arrayBuffer() {
			const b = this.body
			if (Buffer.isBuffer(b)) {
				const u = new Uint8Array(b)
				return u.buffer.slice(
					u.byteOffset,
					u.byteOffset + u.byteLength
				) as ArrayBuffer
			}
			if (b instanceof Uint8Array) {
				return b.buffer.slice(
					b.byteOffset,
					b.byteOffset + b.byteLength
				) as ArrayBuffer
			}
			return new ArrayBuffer(0)
		}

		static json(
			data: unknown,
			init?: { status?: number; headers?: Record<string, string> }
		) {
			return {
				status: init?.status ?? 200,
				json: async () => data,
				headers: {
					get: (n: string) => {
						const headers = init?.headers
						if (!headers) return null
						const found = Object.keys(headers).find(
							(k) => k.toLowerCase() === n.toLowerCase()
						)
						return found ? headers[found] : null
					},
				},
			}
		}
	},
}))

function roleDates() {
	const d = new Date()
	return { description: '', active: true, createdAt: d, updatedAt: d }
}

function minimalExportBusiness(
	overrides: Partial<BusinessExportPayload> = {}
): BusinessExportPayload {
	const base = {
		idBusiness: 1,
		contract: 'C-1',
		term: 3,
		value: { toNumber: () => 100 } as never,
		status: 'FONDEADO',
		createdAt: new Date('2026-01-01'),
		dateIssued: null,
		dateAnchored: new Date('2026-02-01'),
		idBuyPeriodicity: 1,
		idUser: 10,
		idClient: 20,
		idProductPercentageCommission: 30,
		idCurrency: 40,
		idClientOrigin: 50,
		updatedAt: new Date(),
		client: {
			idClient: 20,
			name: 'Ana',
			lastName: 'Pérez',
			identityNumber: '123',
			email: 'a@x.com',
			phone: null,
			typeIdentity: 'CC',
			direcction: null,
			city: null,
			country: 'Colombia',
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		user: {
			idUser: 10,
			name: 'Coach',
			lastName: 'Uno',
			email: 'c@x.com',
			phone: null,
			typeIdentity: 'CC',
			identityNumber: '999',
			idCategoria: 1,
			idUserLeader: null,
			entryDate: new Date(),
			retirementDate: null,
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			idRole: 1,
			password: null,
			ssoOnly: true,
			role: { idRole: 1, code: 'AGENTE', name: 'Agente', ...roleDates() },
			category: { name: 'Cat A' },
		},
		productPercentageCommission: {
			idProductPercentageCommission: 30,
			productConfiguration: {
				product: {
					idProduct: 1,
					name: 'Prod',
					company: { idCompany: 1, name: 'Comp' },
				},
			},
		},
		currency: { idCurrency: 40, name: 'COP' },
		buyPeriodicity: { idBuyPeriodicity: 1, name: 'Mensual' },
		clientOrigin: { idClientOrigin: 50, name: 'Origen X' },
		annualPayments: [],
	} as unknown as BusinessExportPayload
	return { ...base, ...overrides }
}

describe('POST /api/negocios/export', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetUser = vi.mocked(getCurrentUserByEmail)
	const mockCount = vi.mocked(prisma.business.count)
	const mockFindMany = vi.mocked(prisma.business.findMany)
	const mockUserFindUnique = vi.mocked(prisma.user.findUnique)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('retorna 403 cuando el rol es AGENTE', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'coach@test.com' },
		} as never)
		mockGetUser.mockResolvedValue({
			idUser: 1,
			role: {
				code: UserRole.AGENTE,
				name: 'Agente',
			},
		} as never)

		const req = new Request('http://localhost/api/negocios/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				dateFrom: '2026-04-01',
				dateTo: '2026-04-30',
			}),
		})

		const res = await POST(req)
		expect(res.status).toBe(403)
	})

	it('retorna 403 cuando el rol es CONSULTOR (solo lectura) — canExportBusinessList ya lo excluye (D3)', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'consultor@test.com' },
		} as never)
		mockGetUser.mockResolvedValue({
			idUser: 9,
			role: {
				code: UserRole.CONSULTOR,
				name: 'Consultor',
			},
			idLevel: null,
			level: null,
		} as never)

		const req = new Request('http://localhost/api/negocios/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				dateFrom: '2026-04-01',
				dateTo: '2026-04-30',
			}),
		})

		const res = await POST(req)
		expect(res.status).toBe(403)
		expect(mockFindMany).not.toHaveBeenCalled()
	})

	it('retorna 200, xlsx y cuerpo no vacío cuando hay datos (ADMIN)', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'admin@test.com' },
		} as never)
		mockGetUser.mockResolvedValue({
			idUser: 1,
			role: { code: UserRole.ADMIN, name: 'Admin' },
		} as never)
		mockCount.mockResolvedValue(1)
		mockFindMany.mockResolvedValue([minimalExportBusiness()] as never)
		mockUserFindUnique.mockResolvedValue({ idUserLeader: null } as never)

		const req = new Request('http://localhost/api/negocios/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		})

		const res = await POST(req)
		expect(res.status).toBe(200)
		expect(res.headers.get('Content-Type')).toBe(
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		const buf = Buffer.from(await res.arrayBuffer())
		expect(buf.length).toBeGreaterThan(0)
		expect(mockFindMany).toHaveBeenCalledTimes(1)
	})

	it('retorna 413 cuando el conteo supera EXPORT_MAX_ROWS', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'admin@test.com' },
		} as never)
		mockGetUser.mockResolvedValue({
			idUser: 1,
			role: { code: UserRole.ADMIN, name: 'Admin' },
		} as never)
		mockCount.mockResolvedValue(EXPORT_MAX_ROWS + 1)

		const req = new Request('http://localhost/api/negocios/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		})

		const res = await POST(req)
		expect(res.status).toBe(413)
		const json = (await res.json()) as { error: string }
		expect(json.error).toContain(String(EXPORT_MAX_ROWS))
		expect(mockFindMany).not.toHaveBeenCalled()
	})

	it('retorna 404 cuando no hay negocios que coincidan', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'admin@test.com' },
		} as never)
		mockGetUser.mockResolvedValue({
			idUser: 1,
			role: { code: UserRole.ADMIN, name: 'Admin' },
		} as never)
		mockCount.mockResolvedValue(0)

		const req = new Request('http://localhost/api/negocios/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ search: '__no_match_export_test__' }),
		})

		const res = await POST(req)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: string }
		expect(json.error).toMatch(/No hay registros/i)
		expect(mockFindMany).not.toHaveBeenCalled()
	})

	it('retorna 200 con rol ANALISTA_SOPORTE (export permitido)', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'analista@test.com' },
		} as never)
		mockGetUser.mockResolvedValue({
			idUser: 2,
			role: {
				code: UserRole.ANALISTA_SOPORTE,
				name: 'Analista',
			},
		} as never)
		mockCount.mockResolvedValue(1)
		mockFindMany.mockResolvedValue([minimalExportBusiness()] as never)
		mockUserFindUnique.mockResolvedValue({ idUserLeader: null } as never)

		const req = new Request('http://localhost/api/negocios/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		})

		const res = await POST(req)
		expect(res.status).toBe(200)
		expect(mockFindMany).toHaveBeenCalledTimes(1)
	})
})
