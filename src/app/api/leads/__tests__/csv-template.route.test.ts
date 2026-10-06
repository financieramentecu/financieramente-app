import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../leads/csv-template/route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { LEAD_CSV_HEADERS } from '@/features/leads/lib/lead-csv-template'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('next/server', () => ({
	NextResponse: class MockNextResponse {
		body: unknown
		init?: { headers?: Record<string, string>; status?: number }

		constructor(body: unknown, init?: { headers?: Record<string, string>; status?: number }) {
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
				const found = Object.keys(h).find((k) => k.toLowerCase() === name.toLowerCase())
				return found ? h[found] : null
			},
		}

		async text() {
			return typeof this.body === 'string' ? this.body : ''
		}

		static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
			return {
				status: init?.status ?? 200,
				json: async () => data,
				headers: {
					get: (n: string) => {
						const headers = init?.headers
						if (!headers) return null
						const found = Object.keys(headers).find((k) => k.toLowerCase() === n.toLowerCase())
						return found ? headers[found] : null
					},
				},
			}
		}
	},
}))

describe('GET /api/leads/csv-template', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns 401 when there is no session', async () => {
		vi.mocked(auth).mockResolvedValue(null)

		const response = await GET()
		expect(response.status).toBe(401)
	})

	it('returns 403 for a role other than ADMIN/ASISTENTE_GERENCIA_OPERATIVA', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'agent@x.com' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 2,
			role: { code: 'AGENTE' },
		} as never)

		const response = await GET()
		expect(response.status).toBe(403)
	})

	it('returns exactly the 11 headers ending in propietario_nombre, with Content-Disposition attachment for ADMIN', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'admin@x.com' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			role: { code: 'ADMIN' },
		} as never)

		const response = await GET()
		expect(response.status).toBe(200)
		expect(response.headers.get('Content-Disposition')).toContain('attachment')

		const body = await response.text()
		const lines = body.split('\n').filter((l) => l.length > 0)
		expect(lines).toHaveLength(1)
		expect(lines[0]).toBe(LEAD_CSV_HEADERS.join(','))
		expect(lines[0].split(',')).toHaveLength(11)
		expect(lines[0].endsWith('propietario_nombre')).toBe(true)
	})

	it('allows ASISTENTE_GERENCIA_OPERATIVA', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'asistente@x.com' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 3,
			role: { code: 'ASISTENTE_GERENCIA_OPERATIVA' },
		} as never)

		const response = await GET()
		expect(response.status).toBe(200)
	})
})
