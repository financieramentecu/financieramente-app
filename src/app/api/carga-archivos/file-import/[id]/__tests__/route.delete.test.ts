import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { DELETE } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { deleteFileImport } from '@/features/load-file/services/delete-file-import.service'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'

vi.mock('@/lib/auth/nextauth')
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/load-file/services/delete-file-import.service')
vi.mock('@/features/load-file/services/file-import-records.service')
vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => ({
	...(await importOriginal<
		typeof import('@/features/auth/lib/audit-logger')
	>()),
	logAuditEvent: vi.fn(),
}))

const mockAuth = vi.mocked(auth)
const mockDelete = vi.mocked(deleteFileImport)
const mockAudit = vi.mocked(logAuditEvent)

const request = {
	headers: new Headers({
		'x-forwarded-for': '10.0.0.1',
		'user-agent': 'vitest',
	}),
} as unknown as NextRequest
const props = { params: Promise.resolve({ id: '42' }) }

describe('DELETE /api/carga-archivos/file-import/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockAuth.mockResolvedValue({
			user: { id: '7', email: 'user@test.com' },
		} as never)
	})

	it('logs an audit event when the file import is deleted', async () => {
		mockDelete.mockResolvedValue({ ok: true })

		const res = await DELETE(request, props)

		expect(res.status).toBe(200)
		expect(mockDelete).toHaveBeenCalledWith(42, 7)
		expect(mockAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 7,
				email: 'user@test.com',
				action: AuditAction.FILE_IMPORT_DELETED,
				details: expect.stringContaining('42'),
			})
		)
	})

	it('does not log an audit event when the delete is rejected', async () => {
		mockDelete.mockResolvedValue({
			ok: false,
			code: 'INVALID_STATUS',
			message: 'estado inválido',
		})

		const res = await DELETE(request, props)

		expect(res.status).toBe(409)
		expect(mockAudit).not.toHaveBeenCalled()
	})
})
