import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE } from '../route'
import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { rejectPhysicalDocumentTypeRemoval } from '@/features/document-types/services/document-type.service'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/document-types/services/document-type.service', () => ({
	updateDocumentType: vi.fn(),
	rejectPhysicalDocumentTypeRemoval: vi.fn(),
}))

describe('DELETE /api/admin/document-types/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('refuses to delete a document type that clients already use', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: { email: 'admin@test.com', role: UserRole.ADMIN },
		} as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			role: { code: UserRole.ADMIN },
		} as never)
		vi.mocked(rejectPhysicalDocumentTypeRemoval).mockResolvedValue({
			error:
				'Este tipo de documento tiene clientes relacionados. Inactívalo para ocultarlo en nuevas asignaciones sin romper el histórico.',
		})

		const response = await DELETE(new Request('http://localhost'), {
			params: Promise.resolve({ id: '4' }),
		})
		const body = await response.json()

		expect(response.status).toBe(409)
		expect(body.data).toBeNull()
		expect(body.error).toMatch(/clientes relacionados/)
		expect(rejectPhysicalDocumentTypeRemoval).toHaveBeenCalledWith(4)
	})
})
