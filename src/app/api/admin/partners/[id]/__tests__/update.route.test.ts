import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/auth/require-role', () => ({ requireRole: vi.fn() }))

vi.mock('@/features/admin/partners/services/partner.service', async () => {
	const errors =
		await import('@/features/admin/partners/services/partner-errors')
	return {
		PartnerServiceError: errors.PartnerServiceError,
		updatePartner: vi.fn(),
	}
})

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { PARTNER_UPDATED: 'PARTNER_UPDATED' },
	getClientIp: vi.fn(() => '10.0.0.1'),
	getUserAgent: vi.fn(() => 'vitest-agent'),
}))

import { PUT } from '../route'
import { requireRole } from '@/lib/auth/require-role'
import {
	PartnerServiceError,
	updatePartner,
} from '@/features/admin/partners/services/partner.service'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { PartnerDto } from '@/features/admin/partners/types/partner.types'

const SESSION = { user: { id: '1', email: 'admin@corp.com', role: 'ADMIN' } }

const PARTNER: PartnerDto = {
	id: 21,
	name: 'Ana',
	lastName: 'Gómez',
	typeIdentity: 'CC',
	identityNumber: '1020304050',
	email: 'ana@partner.com',
	phone: '3001234567',
	active: true,
	activatedAt: null,
	createdAt: '2026-10-10T12:00:00.000Z',
	status: 'PENDING',
	leader: null,
}

const BODY = {
	name: 'Ana',
	lastName: 'Gómez',
	typeIdentity: 'CC',
	identityNumber: '1020304050',
	phone: '3001234567',
	leaderId: 7,
}

const put = (body: unknown, raw?: string) =>
	new Request('http://localhost/api/admin/partners/21', {
		method: 'PUT',
		body: raw ?? JSON.stringify(body),
	})
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(requireRole).mockResolvedValue({
		ok: true,
		session: SESSION,
	} as never)
	vi.mocked(updatePartner).mockResolvedValue({
		partner: PARTNER,
		changedFields: ['phone', 'lastName'],
	})
})

describe('PUT /api/admin/partners/[id]', () => {
	it('requires ADMIN', async () => {
		await PUT(put(BODY), params('21'))
		expect(requireRole).toHaveBeenCalledWith(['ADMIN'])
	})

	it.each([401, 403])(
		'returns the guard response (%i) and changes nothing',
		async (status) => {
			vi.mocked(requireRole).mockResolvedValue({
				ok: false,
				response: NextResponse.json({ success: false, error: 'x' }, { status }),
			} as never)
			const response = await PUT(put(BODY), params('21'))
			expect(response.status).toBe(status)
			expect(updatePartner).not.toHaveBeenCalled()
			expect(logAuditEvent).not.toHaveBeenCalled()
		}
	)

	it.each(['abc', '0', '-3', '1.5'])(
		'rejects invalid id "%s" with 400',
		async (id) => {
			const response = await PUT(put(BODY), params(id))
			expect(response.status).toBe(400)
			expect(updatePartner).not.toHaveBeenCalled()
		}
	)

	it('returns 200 with the PartnerDto', async () => {
		const response = await PUT(put(BODY), params('21'))
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ data: PARTNER })
		expect(updatePartner).toHaveBeenCalledWith(21, BODY)
	})

	it('strips email and server-owned fields before calling the service', async () => {
		await PUT(
			put({
				...BODY,
				email: 'hacker@x.com',
				role: 'ADMIN',
				roleId: 1,
				levelId: 2,
				categoryId: 3,
				active: false,
				activatedAt: '2026-01-01',
				password: 'secret',
			}),
			params('21')
		)
		expect(updatePartner).toHaveBeenCalledWith(21, BODY)
	})

	it('returns 400 with the failing field for an invalid body', async () => {
		const response = await PUT(put({ ...BODY, name: '' }), params('21'))
		expect(response.status).toBe(400)
		const json = await response.json()
		expect(json.error).toBe('El nombre es obligatorio')
		expect(json.details).toEqual({ field: 'name' })
		expect(updatePartner).not.toHaveBeenCalled()
	})

	it('returns 400 for malformed JSON', async () => {
		const response = await PUT(put(null, '{not json'), params('21'))
		expect(response.status).toBe(400)
		expect(updatePartner).not.toHaveBeenCalled()
	})

	it.each([
		['INVALID_LEADER', 400, 'leaderId'],
		['NOT_FOUND', 404, undefined],
		['IDENTITY_TAKEN', 409, 'identityNumber'],
	] as const)('maps %s to %i', async (code, status, field) => {
		vi.mocked(updatePartner).mockRejectedValue(
			new PartnerServiceError(code, 'mensaje', field)
		)
		const response = await PUT(put(BODY), params('21'))
		expect(response.status).toBe(status)
		const json = await response.json()
		expect(json.error).toBe('mensaje')
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('answers a generic 500 without leaking internals', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(updatePartner).mockRejectedValue(new Error('prisma boom secret'))
		const response = await PUT(put(BODY), params('21'))
		expect(response.status).toBe(500)
		expect(JSON.stringify(await response.json())).not.toContain('secret')
	})

	it('audits exactly once with actor, ip, user agent and the changed field names [AUD]', async () => {
		await PUT(put(BODY), params('21'))
		expect(logAuditEvent).toHaveBeenCalledTimes(1)
		const event = vi.mocked(logAuditEvent).mock.calls[0][0]
		expect(event).toMatchObject({
			userId: 1,
			action: 'PARTNER_UPDATED',
			email: 'ana@partner.com',
			ipAddress: '10.0.0.1',
			userAgent: 'vitest-agent',
		})
		expect(event.details).toContain('phone')
		expect(event.details).toContain('lastName')
		expect(event.details).not.toContain('3001234567')
		expect(event.details).not.toContain('1020304050')
	})

	it('writes no audit event when nothing changed, but still answers 200', async () => {
		vi.mocked(updatePartner).mockResolvedValue({
			partner: PARTNER,
			changedFields: [],
		})
		const response = await PUT(put(BODY), params('21'))
		expect(response.status).toBe(200)
		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})
