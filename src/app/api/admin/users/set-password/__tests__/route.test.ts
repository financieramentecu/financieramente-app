import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/nextauth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
	prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}))
vi.mock('@/features/auth/lib/password-utils', () => ({
	hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
	validatePasswordStrength: vi.fn(() => ({ isValid: true })),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { USER_PASSWORD_SET: 'USER_PASSWORD_SET' },
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'vitest'),
}))

import { POST } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'

function request(body: unknown) {
	return new Request('http://localhost/api/admin/users/set-password', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-real-ip': '127.0.0.1',
			'user-agent': 'vitest',
		},
		body: JSON.stringify(body),
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(prisma.user.update).mockReset()
	vi.mocked(auth).mockResolvedValue({
		user: { id: '1', role: 'ADMIN' },
	} as never)
})

describe('POST /api/admin/users/set-password — partner guard', () => {
	it('refuses to set a password on a partner and points to the Partners module', async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idUser: 20,
			role: { code: 'PARTNER' },
			level: { code: 'PARTNER_EXTERNAL' },
		} as never)

		const response = await POST(
			request({ userId: 20, password: 'abcd1234', ssoOnly: false })
		)
		const json = await response.json()

		expect(response.status).toBe(403)
		expect(json.error).toContain('módulo Partners')
		expect(prisma.user.update).not.toHaveBeenCalled()
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it.each([false, true])(
		'audits an ADMIN password update with ssoOnly=%s',
		async (ssoOnly) => {
			vi.mocked(prisma.user.findUnique).mockResolvedValue({
				idUser: 2,
				idRole: 1,
				email: 'admin@example.com',
				role: { code: 'ADMIN' },
				level: null,
			} as never)
			vi.mocked(prisma.user.update).mockResolvedValue({} as never)

			const response = await POST(
				request({ userId: 2, password: 'abcd1234', ssoOnly })
			)

			expect(response.status).toBe(200)
			expect(prisma.user.update).toHaveBeenCalledWith({
				where: { idUser: 2 },
				data: { password: 'hashed:abcd1234', ssoOnly },
			})
			expect(logAuditEvent).toHaveBeenCalledTimes(1)
			expect(vi.mocked(prisma.user.update).mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(logAuditEvent).mock.invocationCallOrder[0]
			)
			expect(JSON.stringify(vi.mocked(logAuditEvent).mock.calls)).not.toContain(
				'abcd1234'
			)
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 1,
					roleId: 1,
					action: 'USER_PASSWORD_SET',
					email: 'admin@example.com',
					ipAddress: '127.0.0.1',
					userAgent: 'vitest',
					details: expect.stringContaining('Usuario id=2'),
				})
			)
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.stringContaining(`ssoOnly=${ssoOnly}`),
				})
			)
		}
	)
})

describe('set-password audit failures', () => {
	it('does not audit an unauthenticated request', async () => {
		vi.mocked(auth).mockResolvedValue(null as never)
		const response = await POST(
			request({ userId: 2, password: 'abcd1234', ssoOnly: false })
		)
		expect(response.status).toBe(401)
		expect(prisma.user.update).not.toHaveBeenCalled()
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('does not audit a failed password update', async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idUser: 2,
			idRole: 1,
			email: 'admin@example.com',
			role: { code: 'ADMIN' },
			level: null,
		} as never)
		vi.mocked(prisma.user.update).mockRejectedValueOnce(
			new Error('Update failed')
		)
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			const response = await POST(
				request({ userId: 2, password: 'abcd1234', ssoOnly: false })
			)
			expect(response.status).toBe(500)
			expect(logAuditEvent).not.toHaveBeenCalled()
		} finally {
			consoleError.mockRestore()
		}
	})
})
