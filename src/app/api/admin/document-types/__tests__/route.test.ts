import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'
import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { createDocumentType } from '@/features/document-types/services/document-type.service'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/document-types/services/document-type.service', () => ({
	listDocumentTypes: vi.fn(),
	createDocumentType: vi.fn(),
}))
vi.mock('next/cache', () => ({
	revalidateTag: vi.fn(),
}))

describe('admin document types routes', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 403 when the session is not the system administrator', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: { email: 'ago@test.com', role: UserRole.ASISTENTE_GERENCIA_OPERATIVA },
		} as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 2,
			role: { code: UserRole.ASISTENTE_GERENCIA_OPERATIVA },
		} as never)

		const response = await GET()
		const body = await response.json()

		expect(response.status).toBe(403)
		expect(body.data).toBeNull()
	})

	it('returns 401 when there is no session', async () => {
		vi.mocked(auth).mockResolvedValue(null as never)

		const response = await GET()

		expect(response.status).toBe(401)
	})

	it('creates a document type for the system administrator', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: { email: 'admin@test.com', role: UserRole.ADMIN },
		} as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			role: { code: UserRole.ADMIN },
		} as never)
		vi.mocked(createDocumentType).mockResolvedValue({
			documentType: {
				idDocumentType: 9,
				name: 'Pasaporte diplomático',
				code: 'PD',
				dataType: 'ALPHANUMERIC',
				minLength: 6,
				maxLength: 12,
				status: true,
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
		})

		const response = await POST(
			new Request('http://localhost/api/admin/document-types', {
				method: 'POST',
				body: JSON.stringify({
					name: 'Pasaporte diplomático',
					code: 'PD',
					dataType: 'ALPHANUMERIC',
					minLength: 6,
					maxLength: 12,
					status: true,
				}),
			})
		)
		const body = await response.json()

		expect(response.status).toBe(201)
		expect(body.data.code).toBe('PD')
	})
})
