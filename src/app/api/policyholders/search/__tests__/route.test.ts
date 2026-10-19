import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import { searchPolicyholdersByDocument } from '@/features/policyholders/services/policyholder.service'

vi.mock('@/lib/auth/nextauth', () => ({
	auth: vi.fn(),
}))

vi.mock('@/features/policyholders/services/policyholder.service', () => ({
	searchPolicyholdersByDocument: vi.fn(),
}))

const mockAuth = vi.mocked(auth)
const mockSearch = vi.mocked(searchPolicyholdersByDocument)

const samplePolicyholder = {
	idPolicyholder: 7,
	name: 'Ana',
	lastName: 'Pérez',
	typeIdentity: 'CC',
	identityNumber: '123456789',
	email: 'ana@example.com',
	phone: '3001234567',
}

function searchRequest(query = '123456', limit = '10') {
	return new Request(
		`http://localhost/api/policyholders/search?query=${query}&limit=${limit}`
	)
}

function sessionFor(role: UserRole) {
	return {
		user: { id: '1', role },
	} as never
}

describe('GET /api/policyholders/search', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockSearch.mockResolvedValue([samplePolicyholder])
	})

	it('returns 401 when the caller is not authenticated and does not search', async () => {
		mockAuth.mockResolvedValue(null as never)

		const response = await GET(searchRequest())

		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body.error).toBe('No autorizado')
		expect(mockSearch).not.toHaveBeenCalled()
	})

	it.each([
		UserRole.AGENTE,
		UserRole.ANALISTA_SOPORTE,
		UserRole.CONSULTOR,
		UserRole.DEFAULT,
	])(
		'returns 403 for %s and does not return policyholder data',
		async (role) => {
			mockAuth.mockResolvedValue(sessionFor(role))

			const response = await GET(searchRequest())

			expect(response.status).toBe(403)
			const body = await response.json()
			expect(body.data).toBeNull()
			expect(body.error).toBe('Sin permisos para consultar tomadores')
			expect(mockSearch).not.toHaveBeenCalled()
		}
	)

	it.each([UserRole.ADMIN, UserRole.ASISTENTE_GERENCIA_OPERATIVA])(
		'returns matching policyholders for %s',
		async (role) => {
			mockAuth.mockResolvedValue(sessionFor(role))

			const response = await GET(searchRequest('123456', '10'))

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.data).toEqual([samplePolicyholder])
			expect(mockSearch).toHaveBeenCalledWith('123456', 10)
		}
	)

	it('does not search when an allowed role sends a query shorter than 3 characters', async () => {
		mockAuth.mockResolvedValue(sessionFor(UserRole.ADMIN))

		const response = await GET(searchRequest('12'))

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.data).toEqual([])
		expect(mockSearch).not.toHaveBeenCalled()
	})
})
