import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '../route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'

vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		clientOrigin: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		business: {
			count: vi.fn(),
		},
	},
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { CLIENT_ORIGIN_DELETED: 'CLIENT_ORIGIN_DELETED' },
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
}))

const mockAuth = vi.mocked(auth)
const mockFindUnique = vi.mocked(prisma.clientOrigin.findUnique)
const mockUpdate = vi.mocked(prisma.clientOrigin.update)
const mockBusinessCount = vi.mocked(prisma.business.count)
const mockLogAuditEvent = vi.mocked(logAuditEvent)

const origin = { idClientOrigin: 7, name: 'Referido', status: true }
const request = new Request('http://localhost:3000/api/origins/7', {
	method: 'DELETE',
})
const props = { params: Promise.resolve({ id: '7' }) }

describe('DELETE /api/origins/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockAuth.mockResolvedValue({
			user: { id: '1', email: 'admin@example.com' },
		} as never)
		mockFindUnique.mockResolvedValue(origin as never)
		mockBusinessCount.mockResolvedValue(0 as never)
		mockUpdate.mockResolvedValue({ ...origin, status: false } as never)
	})

	it('soft deletes the origin by setting status to false', async () => {
		const res = await DELETE(request, props)

		expect(res.status).toBe(200)
		expect(mockUpdate).toHaveBeenCalledWith({
			where: { idClientOrigin: 7 },
			data: { status: false },
		})
	})

	it('logs an audit event on success', async () => {
		await DELETE(request, props)

		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 1,
				action: 'CLIENT_ORIGIN_DELETED',
			})
		)
	})

	it('rejects with 409 and does not touch data when the origin is in use', async () => {
		mockBusinessCount.mockResolvedValue(3 as never)

		const res = await DELETE(request, props)

		expect(res.status).toBe(409)
		expect(mockUpdate).not.toHaveBeenCalled()
		expect(mockLogAuditEvent).not.toHaveBeenCalled()
	})

	it('returns 404 when the origin does not exist', async () => {
		mockFindUnique.mockResolvedValue(null as never)

		const res = await DELETE(request, props)

		expect(res.status).toBe(404)
		expect(mockUpdate).not.toHaveBeenCalled()
	})

	it('returns 401 without a session', async () => {
		mockAuth.mockResolvedValue(null as never)

		const res = await DELETE(request, props)

		expect(res.status).toBe(401)
		expect(mockUpdate).not.toHaveBeenCalled()
	})
})
