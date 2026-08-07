import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveExistingClient as resolveExistingClientAction } from '@/features/negocios/actions/resolve-existing-client'
import { resolveExistingClient as resolveExistingClientService } from '@/features/negocios/services/client-resolution.service'
import { auth } from '@/lib/auth/nextauth'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'

vi.mock('@/features/negocios/services/client-resolution.service', () => ({
	resolveExistingClient: vi.fn(),
}))

vi.mock('@/lib/auth/nextauth', () => ({
	auth: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()
	return {
		...actual,
		logAuditEvent: vi.fn().mockResolvedValue(undefined),
		getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
		getUserAgent: vi.fn().mockReturnValue('vitest'),
	}
})

vi.mock('next/headers', () => ({
	headers: vi.fn().mockResolvedValue(new Headers()),
}))

const activeClient = {
	idClient: 1,
	name: 'Ana',
	lastName: 'Pérez',
	typeIdentity: 'CC',
	identityNumber: '1234567890',
	email: 'ana@example.com',
	phone: '3001234567',
	direcction: null,
	city: null,
	country: 'Colombia',
	active: true,
	createdAt: new Date(),
	updatedAt: new Date(),
}

describe('resolveExistingClient action', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(auth).mockResolvedValue({
			user: { id: '1', email: 'agente@financieramentecu.com', role: 'AGENTE' },
		} as never)
	})

	it('rejects unauthenticated callers', async () => {
		vi.mocked(auth).mockResolvedValueOnce(null as never)

		const result = await resolveExistingClientAction({
			typeIdentity: 'CC',
			identityNumber: '1234567890',
			email: 'ana@example.com',
			leadId: 5,
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe('No autorizado')
		expect(resolveExistingClientService).not.toHaveBeenCalled()
	})

	it('rejects invalid input via Zod', async () => {
		const result = await resolveExistingClientAction({
			identityNumber: 'abc',
			leadId: 5,
		} as never)

		expect(result.data).toBeNull()
		expect('error' in result).toBe(true)
		expect(resolveExistingClientService).not.toHaveBeenCalled()
	})

	it('calls the resolution service with allowReactivation: true and returns ApiResponse<ClientResolution|null>', async () => {
		vi.mocked(resolveExistingClientService).mockResolvedValueOnce({
			client: activeClient,
			source: 'document',
		})

		const result = await resolveExistingClientAction({
			typeIdentity: 'CC',
			identityNumber: '1234567890',
			email: 'ana@example.com',
			leadId: 5,
		})

		expect(resolveExistingClientService).toHaveBeenCalledWith({
			typeIdentity: 'CC',
			identityNumber: '1234567890',
			email: 'ana@example.com',
			allowReactivation: true,
		})
		expect(result.data).toEqual({ client: activeClient, source: 'document' })
	})

	it('emits CLIENT_REACTIVATED with actor/ip/userAgent when the resolution reactivates a client', async () => {
		vi.mocked(resolveExistingClientService).mockResolvedValueOnce({
			client: { ...activeClient, idClient: 2 },
			source: 'reactivated',
		})

		await resolveExistingClientAction({
			typeIdentity: 'CC',
			identityNumber: '1234567890',
			email: 'ana@example.com',
			leadId: 5,
		})

		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.CLIENT_REACTIVATED,
				email: 'agente@financieramentecu.com',
				ipAddress: '127.0.0.1',
				userAgent: 'vitest',
			})
		)
	})

	it('does not emit an audit event when the resolution source is "document" or "email"', async () => {
		vi.mocked(resolveExistingClientService).mockResolvedValueOnce({
			client: activeClient,
			source: 'document',
		})

		await resolveExistingClientAction({
			typeIdentity: 'CC',
			identityNumber: '1234567890',
			leadId: 5,
		})

		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})
