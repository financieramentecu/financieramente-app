/**
 * Integration-style authz tests for Producción Real report APIs.
 * Auth, canViewReport, scope, and domain services are mocked (no live DB).
 *
 * Overrides vitest.setup `next/server` stub so query URLs and binary
 * NextResponse responses work like App Router handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import * as XLSX from 'xlsx-js-style'
import {
	buildProduccionRealExcelBuffer,
	PRODUCCION_REAL_SHEET,
} from '@/features/reports/produccion-real/lib/build-produccion-real-excel'
import { CURRENCY_MODE } from '@/features/reports/produccion-real/types/produccion-real.types'

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

vi.mock(
	'@/features/reports/produccion-real/services/produccion-real-scope.service',
	() => ({
		intersectUserIdsWithViewerScope: vi.fn(
			async (userIds: readonly number[]) => [...userIds]
		),
	})
)

vi.mock(
	'@/features/reports/produccion-real/services/produccion-real-kpi.service',
	() => ({
		getProduccionRealKpis: vi.fn(),
	})
)

vi.mock(
	'@/features/reports/produccion-real/services/produccion-real-detail.service',
	() => ({
		getProduccionRealDetail: vi.fn(),
		encodeDetailCursor: vi.fn(() => null),
	})
)

vi.mock(
	'@/features/reports/produccion-real/services/produccion-real-export.service',
	() => ({
		exportProduccionRealExcel: vi.fn(),
		ProduccionRealExportEmptyError: class ProduccionRealExportEmptyError extends Error {
			constructor() {
				super('Sin datos para exportar')
				this.name = 'ProduccionRealExportEmptyError'
			}
		},
		ProduccionRealExportOversizeError: class ProduccionRealExportOversizeError extends Error {
			constructor() {
				super('Exportación demasiado grande')
				this.name = 'ProduccionRealExportOversizeError'
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

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { getProduccionRealKpis } from '@/features/reports/produccion-real/services/produccion-real-kpi.service'
import { getProduccionRealDetail } from '@/features/reports/produccion-real/services/produccion-real-detail.service'
import { exportProduccionRealExcel } from '@/features/reports/produccion-real/services/produccion-real-export.service'
import { GET as getKpis } from '@/app/api/reports/produccion-real/kpis/route'
import { GET as getDetail } from '@/app/api/reports/produccion-real/detail/route'
import { POST as postExport } from '@/app/api/reports/produccion-real/export/route'

const mockAuth = vi.mocked(auth)
const mockGetUser = vi.mocked(getCurrentUserByEmail)
const mockCanView = vi.mocked(canViewReport)
const mockKpis = vi.mocked(getProduccionRealKpis)
const mockDetail = vi.mocked(getProduccionRealDetail)
const mockExport = vi.mocked(exportProduccionRealExcel)

function makeUser(overrides: {
	roleCode?: string
	idCategory?: number | null
	email?: string
} = {}) {
	return {
		idUser: 42,
		email: overrides.email ?? 'user@test.com',
		name: 'Tester',
		idCategory: overrides.idCategory ?? 4,
		role: { code: overrides.roleCode ?? UserRole.AGENTE },
		level: { code: 'LEVEL_2' },
	}
}

function kpiQueryUrl(extra: Record<string, string> = {}) {
	const url = new URL('http://localhost/api/reports/produccion-real/kpis')
	url.searchParams.set('dateFrom', '2026-08-01')
	url.searchParams.set('dateTo', '2026-08-31')
	url.searchParams.set('currencyMode', 'ALL_TRM')
	url.searchParams.set('userIds', '10')
	url.searchParams.set('trmRate', '4000')
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
		contributionTypes: [],
		companyIds: [],
		currencyMode: 'ALL_TRM',
		userIds: [10],
		trmRate: 4000,
		...overrides,
	}
}

describe('Producción Real report APIs — authorization', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 403 on KPIs when user lacks report permission', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'agent@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue(
			makeUser({ roleCode: UserRole.AGENTE, idCategory: 1 }) as never
		)
		mockCanView.mockResolvedValue(false)

		const res = await getKpis(kpiQueryUrl())
		const body = await res.json()

		expect(res.status).toBe(403)
		expect(body.error).toBe('No autorizado para este reporte')
		expect(mockKpis).not.toHaveBeenCalled()
	})

	it('returns 200 on KPIs for Performance Leader with permission', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'leader@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue(
			makeUser({ roleCode: UserRole.AGENTE, idCategory: 4 }) as never
		)
		mockCanView.mockResolvedValue(true)
		mockKpis.mockResolvedValue({
			produccionReal: { sum: 10, count: 1 },
			regular: { sum: 10, count: 1, totalCop: 40000, totalForeignUsd: 0 },
			unico: { sum: 0, count: 0, totalCop: 0, totalForeignUsd: 0 },
			fondeado: { sum: 5, count: 1, conversionPercent: 50 },
			currencyMode: CURRENCY_MODE.ALL_TRM,
			displayCurrencyCode: 'USD',
		})

		const res = await getKpis(kpiQueryUrl())
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.produccionReal.sum).toBe(10)
		expect(mockCanView).toHaveBeenCalled()
		expect(mockKpis).toHaveBeenCalled()
	})

	it('returns 200 on KPIs for ADMIN bypass', async () => {
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
		mockKpis.mockResolvedValue({
			produccionReal: { sum: 0, count: 0 },
			regular: { sum: 0, count: 0, totalCop: 0, totalForeignUsd: 0 },
			unico: { sum: 0, count: 0, totalCop: 0, totalForeignUsd: 0 },
			fondeado: { sum: 0, count: 0, conversionPercent: 0 },
			currencyMode: CURRENCY_MODE.ALL_TRM,
			displayCurrencyCode: 'USD',
		})

		const res = await getKpis(kpiQueryUrl({ userIds: '' }))
		expect(res.status).toBe(200)
		expect(mockCanView).toHaveBeenCalledWith(
			expect.objectContaining({ roleCode: UserRole.ADMIN }),
			'PRODUCCION_REAL'
		)
	})

	it('returns 403 on detail without permission', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'agent@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue(makeUser({ idCategory: 1 }) as never)
		mockCanView.mockResolvedValue(false)

		const url = new URL('http://localhost/api/reports/produccion-real/detail')
		url.searchParams.set('dateFrom', '2026-08-01')
		url.searchParams.set('dateTo', '2026-08-31')
		url.searchParams.set('userIds', '10')
		const res = await getDetail(new NextRequest(url))

		expect(res.status).toBe(403)
		expect(mockDetail).not.toHaveBeenCalled()
	})

	it('returns 403 on export without permission', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'agent@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue(makeUser({ idCategory: 1 }) as never)
		mockCanView.mockResolvedValue(false)

		const res = await postExport(
			new Request('http://localhost/api/reports/produccion-real/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(exportBody()),
			})
		)

		expect(res.status).toBe(403)
		expect(mockExport).not.toHaveBeenCalled()
	})

	it('returns xlsx buffer on export when authorized', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'leader@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue(makeUser({ idCategory: 4 }) as never)
		mockCanView.mockResolvedValue(true)

		const buffer = buildProduccionRealExcelBuffer({
			kpis: {
				produccionReal: { sum: 100, count: 1 },
				regular: { sum: 100, count: 1, totalCop: 400000, totalForeignUsd: 0 },
				unico: { sum: 0, count: 0, totalCop: 0, totalForeignUsd: 0 },
				fondeado: { sum: 50, count: 1, conversionPercent: 50 },
				currencyMode: CURRENCY_MODE.ALL_TRM,
				displayCurrencyCode: 'USD',
			},
			rows: [],
		})
		mockExport.mockResolvedValue({ buffer, rowCount: 1 })

		const res = await postExport(
			new Request('http://localhost/api/reports/produccion-real/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(exportBody()),
			})
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('Content-Type')).toContain(
			'spreadsheetml.sheet'
		)
		expect(mockExport).toHaveBeenCalled()

		const bytes = Buffer.from(await res.arrayBuffer())
		const workbook = XLSX.read(bytes, { type: 'buffer' })
		expect(workbook.SheetNames).toEqual([
			PRODUCCION_REAL_SHEET.RESUMEN_KPI,
			PRODUCCION_REAL_SHEET.REGULAR_VS_UNICA,
			PRODUCCION_REAL_SHEET.DETALLE,
		])
	})
})
