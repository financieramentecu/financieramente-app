/**
 * Authz tests for ABA-MFUND report APIs.
 * Auth, canViewReport, scope, and domain services are mocked (no live DB).
 *
 * Covers 401/403/404, kpis/detail/ranking/export happy paths, export 404/413,
 * audit REPORT_EXPORTED on success, and that APIs do not require the feature flag.
 *
 * Overrides vitest.setup `next/server` stub so query URLs and binary
 * NextResponse responses work like App Router handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import * as XLSX from 'xlsx-js-style'
import {
	buildAbaMfundExcelBuffer,
	buildAbaMfundExcelFilename,
	ABA_MFUND_SHEET,
} from '@/features/reports/aba-mfund/lib/build-aba-mfund-excel'

vi.mock('next/server', () => {
	class MockNextRequest {
		nextUrl: URL
		url: string
		constructor(input: string | URL | { nextUrl?: URL; url?: string }) {
			if (typeof input === 'string') {
				this.nextUrl = new URL(input)
			} else if (input instanceof URL) {
				this.nextUrl = input
			} else if (input && typeof input === 'object' && 'nextUrl' in input && input.nextUrl) {
				this.nextUrl = input.nextUrl
			} else {
				this.nextUrl = new URL('http://localhost')
			}
			this.url = this.nextUrl.toString()
		}
	}

	function MockNextResponse(
		body?: BodyInit | null,
		init?: ResponseInit
	) {
		const headers = new Headers(init?.headers)
		const status = init?.status ?? 200
		return {
			status,
			headers,
			json: async () => {
				if (body == null) return null
				if (typeof body === 'string') {
					try {
						return JSON.parse(body)
					} catch {
						return null
					}
				}
				return null
			},
			arrayBuffer: async () => {
				if (body instanceof Uint8Array) {
					return body.buffer.slice(
						body.byteOffset,
						body.byteOffset + body.byteLength
					)
				}
				if (body instanceof ArrayBuffer) return body
				if (typeof body === 'string') {
					return new TextEncoder().encode(body).buffer
				}
				return new ArrayBuffer(0)
			},
		}
	}

	MockNextResponse.json = (
		data: unknown,
		init?: { status?: number; headers?: HeadersInit }
	) => ({
		status: init?.status ?? 200,
		headers: new Headers(init?.headers),
		json: async () => data,
		arrayBuffer: async () => new ArrayBuffer(0),
	})

	return {
		NextRequest: MockNextRequest,
		NextResponse: MockNextResponse,
	}
})

vi.mock('@/auth', () => ({
	auth: vi.fn(),
}))

vi.mock('@/features/shared/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))

vi.mock(
	'@/features/report-permissions/services/report-permissions.service',
	() => ({
		canViewReport: vi.fn(),
	})
)

vi.mock('@/features/reports/aba-mfund/lib/aba-mfund-scope', () => ({
	intersectUserIdsWithViewerScope: vi.fn(
		async (userIds: readonly number[]) => [...userIds]
	),
}))

vi.mock('@/features/reports/aba-mfund/services/aba-mfund-kpi.service', () => ({
	getAbaMfundKpis: vi.fn(),
}))

vi.mock(
	'@/features/reports/aba-mfund/services/aba-mfund-detail.service',
	() => ({
		getAbaMfundDetail: vi.fn(),
	})
)

vi.mock(
	'@/features/reports/aba-mfund/services/aba-mfund-ranking.service',
	() => ({
		getAbaMfundRanking: vi.fn(),
	})
)

vi.mock(
	'@/features/reports/aba-mfund/services/aba-mfund-export.service',
	() => ({
		exportAbaMfundExcel: vi.fn(),
		AbaMfundExportEmptyError: class AbaMfundExportEmptyError extends Error {
			constructor() {
				super('No hay registros para exportar')
				this.name = 'AbaMfundExportEmptyError'
			}
		},
		AbaMfundExportOversizeError: class AbaMfundExportOversizeError extends Error {
			constructor() {
				super('El resultado supera el máximo de 5000 filas por exportación')
				this.name = 'AbaMfundExportOversizeError'
			}
		},
	})
)

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { REPORT_EXPORTED: 'REPORT_EXPORTED' },
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'vitest'),
}))

vi.mock('@/features/shared/lib/flagsmith-server', () => ({
	isFeatureEnabledServer: vi.fn(),
}))

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { getAbaMfundKpis } from '@/features/reports/aba-mfund/services/aba-mfund-kpi.service'
import { getAbaMfundDetail } from '@/features/reports/aba-mfund/services/aba-mfund-detail.service'
import { getAbaMfundRanking } from '@/features/reports/aba-mfund/services/aba-mfund-ranking.service'
import {
	exportAbaMfundExcel,
	AbaMfundExportEmptyError,
	AbaMfundExportOversizeError,
} from '@/features/reports/aba-mfund/services/aba-mfund-export.service'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { GET as getKpis } from '@/app/api/reports/aba-mfund/kpis/route'
import { GET as getDetail } from '@/app/api/reports/aba-mfund/detail/route'
import { GET as getRanking } from '@/app/api/reports/aba-mfund/ranking/route'
import { POST as postExport } from '@/app/api/reports/aba-mfund/export/route'

const mockAuth = vi.mocked(auth)
const mockGetUser = vi.mocked(getCurrentUserByEmail)
const mockCanView = vi.mocked(canViewReport)
const mockKpis = vi.mocked(getAbaMfundKpis)
const mockDetail = vi.mocked(getAbaMfundDetail)
const mockRanking = vi.mocked(getAbaMfundRanking)
const mockExport = vi.mocked(exportAbaMfundExcel)
const mockAudit = vi.mocked(logAuditEvent)
const mockFlag = vi.mocked(isFeatureEnabledServer)

function makeUser(
	overrides: {
		roleCode?: string
		idCategory?: number | null
		email?: string
	} = {}
) {
	return {
		idUser: 42,
		email: overrides.email ?? 'user@test.com',
		name: 'Tester',
		idCategory: overrides.idCategory ?? 4,
		role: { code: overrides.roleCode ?? UserRole.AGENTE },
		level: { code: 'LEVEL_2' },
	}
}

function queryUrl(path: string, extra: Record<string, string> = {}) {
	const url = new URL(`http://localhost${path}`)
	url.searchParams.set('dateFrom', '2026-08-01')
	url.searchParams.set('dateTo', '2026-08-31')
	url.searchParams.set('userIds', '10')
	Object.entries(extra).forEach(([k, v]) => {
		if (v === '') {
			url.searchParams.delete(k)
		} else {
			url.searchParams.set(k, v)
		}
	})
	return new NextRequest(url)
}

function exportBody(overrides: Record<string, unknown> = {}) {
	return {
		dateFrom: '2026-08-01',
		dateTo: '2026-08-31',
		userIds: [10],
		statuses: [],
		...overrides,
	}
}

function exportRequest(body: Record<string, unknown> = exportBody()) {
	return new Request('http://localhost/api/reports/aba-mfund/export', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

const ZERO_KPIS = {
	abaTotal: { sum: 0, count: 0 },
	fondeado: { sum: 0, count: 0 },
	emitido: { sum: 0, count: 0 },
	ticketPromedio: 0,
}

function mockAuthorizedAgent() {
	mockAuth.mockResolvedValue({
		user: { email: 'leader@test.com', role: UserRole.AGENTE },
	} as never)
	mockGetUser.mockResolvedValue(makeUser({ idCategory: 4 }) as never)
	mockCanView.mockResolvedValue(true)
}

describe('ABA-MFUND report APIs', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it.each([
		['kpis', () => getKpis(queryUrl('/api/reports/aba-mfund/kpis'))],
		['detail', () => getDetail(queryUrl('/api/reports/aba-mfund/detail'))],
		['ranking', () => getRanking(queryUrl('/api/reports/aba-mfund/ranking'))],
		['export', () => postExport(exportRequest())],
	] as const)('returns 401 on %s when unauthenticated', async (_name, call) => {
		mockAuth.mockResolvedValue(null as never)

		const res = await call()
		const body = await res.json()

		expect(res.status).toBe(401)
		expect(body.error).toBe('Unauthorized')
		expect(mockKpis).not.toHaveBeenCalled()
		expect(mockDetail).not.toHaveBeenCalled()
		expect(mockRanking).not.toHaveBeenCalled()
		expect(mockExport).not.toHaveBeenCalled()
		expect(mockFlag).not.toHaveBeenCalled()
	})

	it('returns 404 on KPIs when user is missing', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'ghost@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue(null as never)

		const res = await getKpis(queryUrl('/api/reports/aba-mfund/kpis'))
		const body = await res.json()

		expect(res.status).toBe(404)
		expect(body.error).toBe('Usuario no encontrado')
		expect(mockKpis).not.toHaveBeenCalled()
	})

	it('returns 403 on KPIs when user lacks report permission', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'agent@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue(
			makeUser({ roleCode: UserRole.AGENTE, idCategory: 1 }) as never
		)
		mockCanView.mockResolvedValue(false)

		const res = await getKpis(queryUrl('/api/reports/aba-mfund/kpis'))
		const body = await res.json()

		expect(res.status).toBe(403)
		expect(body.error).toBe('No autorizado para este reporte')
		expect(mockCanView).toHaveBeenCalledWith(
			expect.objectContaining({ roleCode: UserRole.AGENTE }),
			'ABA_MFUND'
		)
		expect(mockKpis).not.toHaveBeenCalled()
		expect(mockFlag).not.toHaveBeenCalled()
	})

	it('returns 200 on KPIs for ADMIN bypass without checking the feature flag', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'admin@test.com', role: UserRole.ADMIN },
		} as never)
		mockGetUser.mockResolvedValue(
			makeUser({
				roleCode: UserRole.ADMIN,
				idCategory: null,
				email: 'admin@test.com',
			}) as never
		)
		mockCanView.mockResolvedValue(true)
		mockKpis.mockResolvedValue(ZERO_KPIS)

		const res = await getKpis(
			queryUrl('/api/reports/aba-mfund/kpis', { userIds: '' })
		)
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.abaTotal.sum).toBe(0)
		expect(mockCanView).toHaveBeenCalledWith(
			expect.objectContaining({ roleCode: UserRole.ADMIN }),
			'ABA_MFUND'
		)
		expect(mockKpis).toHaveBeenCalled()
		expect(mockFlag).not.toHaveBeenCalled()
	})

	it('returns 200 on KPIs for an authorized agent (no feature flag required)', async () => {
		mockAuthorizedAgent()
		mockKpis.mockResolvedValue({
			abaTotal: { sum: 1_000_000, count: 4 },
			fondeado: { sum: 250_000, count: 1 },
			emitido: { sum: 400_000, count: 2 },
			ticketPromedio: 250_000,
		})

		const res = await getKpis(queryUrl('/api/reports/aba-mfund/kpis'))
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.abaTotal.sum).toBe(1_000_000)
		expect(body.data.ticketPromedio).toBe(250_000)
		expect(mockKpis).toHaveBeenCalled()
		expect(mockFlag).not.toHaveBeenCalled()
	})

	it('returns 403 on detail without permission', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'agent@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue(makeUser({ idCategory: 1 }) as never)
		mockCanView.mockResolvedValue(false)

		const res = await getDetail(queryUrl('/api/reports/aba-mfund/detail'))

		expect(res.status).toBe(403)
		expect(mockDetail).not.toHaveBeenCalled()
	})

	it('returns 200 on detail when authorized', async () => {
		mockAuthorizedAgent()
		mockDetail.mockResolvedValue({
			rows: [
				{
					idBusiness: 9,
					createdAt: '2026-08-10T17:00:00.000Z',
					createdAtLabel: '10 ago 2026',
					clientName: 'Ana Gómez',
					periodicityName: 'Mensual',
					status: 'EMITIDO',
					value: 100,
					dateIssued: null,
					dateIssuedLabel: '',
					dateAnchored: null,
					dateAnchoredLabel: '',
				},
			],
			nextCursor: null,
			hasMore: false,
		})

		const res = await getDetail(queryUrl('/api/reports/aba-mfund/detail'))
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.rows).toHaveLength(1)
		expect(body.data.rows[0].clientName).toBe('Ana Gómez')
		expect(body.data.hasMore).toBe(false)
		expect(mockDetail).toHaveBeenCalled()
		expect(mockFlag).not.toHaveBeenCalled()
	})

	it('returns 403 on ranking without permission', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'agent@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue(makeUser({ idCategory: 1 }) as never)
		mockCanView.mockResolvedValue(false)

		const res = await getRanking(queryUrl('/api/reports/aba-mfund/ranking'))

		expect(res.status).toBe(403)
		expect(mockRanking).not.toHaveBeenCalled()
	})

	it('returns 200 on ranking with Top 6 + embedded businesses', async () => {
		mockAuthorizedAgent()
		mockRanking.mockResolvedValue({
			agents: [
				{
					idUser: 10,
					agentName: 'Ana López',
					totalValue: 1_000_000,
					businessCount: 2,
					businesses: [
						{
							idBusiness: 101,
							companyName: 'SKANDIA',
							productName: 'MFUND',
							contract: 'C-001',
							value: 1_000_000,
							currencyName: 'COP',
							status: 'EMITIDO',
						},
					],
				},
			],
		})

		const res = await getRanking(queryUrl('/api/reports/aba-mfund/ranking'))
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.agents).toHaveLength(1)
		expect(body.data.agents[0].idUser).toBe(10)
		expect(body.data.agents[0].businesses[0].contract).toBe('C-001')
		expect(mockRanking).toHaveBeenCalled()
		expect(mockFlag).not.toHaveBeenCalled()
	})

	it('returns 403 on export without permission and does not audit', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'agent@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue(makeUser({ idCategory: 1 }) as never)
		mockCanView.mockResolvedValue(false)

		const res = await postExport(exportRequest())

		expect(res.status).toBe(403)
		expect(mockExport).not.toHaveBeenCalled()
		expect(mockAudit).not.toHaveBeenCalled()
	})

	it('returns xlsx buffer on export when authorized and audits REPORT_EXPORTED', async () => {
		mockAuthorizedAgent()

		const buffer = buildAbaMfundExcelBuffer({ rows: [] })
		const fileName = buildAbaMfundExcelFilename()
		mockExport.mockResolvedValue({ buffer, rowCount: 3, fileName })

		const res = await postExport(exportRequest())

		expect(res.status).toBe(200)
		expect(res.headers.get('Content-Type')).toContain('spreadsheetml.sheet')
		expect(res.headers.get('Content-Disposition')).toContain(fileName)
		expect(mockExport).toHaveBeenCalled()
		expect(mockAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 42,
				action: 'REPORT_EXPORTED',
				email: 'user@test.com',
				ipAddress: '127.0.0.1',
				userAgent: 'vitest',
				details:
					'Exportación de reporte ABA_MFUND: 3 fila(s), 2026-08-01–2026-08-31',
			})
		)

		const bytes = Buffer.from(await res.arrayBuffer())
		const workbook = XLSX.read(bytes, { type: 'buffer' })
		expect(workbook.SheetNames).toEqual([ABA_MFUND_SHEET.DETAIL])
		expect(mockFlag).not.toHaveBeenCalled()
	})

	it('returns 404 on empty export without auditing', async () => {
		mockAuthorizedAgent()
		mockExport.mockRejectedValue(new AbaMfundExportEmptyError())

		const res = await postExport(exportRequest())
		const body = await res.json()

		expect(res.status).toBe(404)
		expect(body.error).toBe('No hay registros para exportar')
		expect(mockAudit).not.toHaveBeenCalled()
	})

	it('returns 413 on oversize export without auditing', async () => {
		mockAuthorizedAgent()
		mockExport.mockRejectedValue(new AbaMfundExportOversizeError())

		const res = await postExport(exportRequest())
		const body = await res.json()

		expect(res.status).toBe(413)
		expect(body.error).toContain('5000')
		expect(mockAudit).not.toHaveBeenCalled()
	})
})
