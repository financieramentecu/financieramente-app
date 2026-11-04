import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/auth/require-role', () => ({ requireRole: vi.fn() }))

vi.mock('@/features/admin/partners/services/partner.service', async () => {
	const errors =
		await import('@/features/admin/partners/services/partner-errors')
	return {
		PartnerServiceError: errors.PartnerServiceError,
		deactivatePartner: vi.fn(),
		reactivatePartner: vi.fn(),
		reissuePartnerActivation: vi.fn(),
	}
})

vi.mock(
	'@/features/admin/partners/services/partner-notification.service',
	() => ({ sendPartnerActivationLink: vi.fn() })
)

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		PARTNER_DEACTIVATED: 'PARTNER_DEACTIVATED',
		PARTNER_REACTIVATED: 'PARTNER_REACTIVATED',
		PARTNER_ACTIVATION_RESENT: 'PARTNER_ACTIVATION_RESENT',
	},
	getClientIp: vi.fn(() => '10.0.0.1'),
	getUserAgent: vi.fn(() => 'vitest-agent'),
}))

import { POST as deactivate } from '../deactivate/route'
import { POST as reactivate } from '../reactivate/route'
import { POST as resend } from '../resend-activation/route'
import { requireRole } from '@/lib/auth/require-role'
import {
	PartnerServiceError,
	deactivatePartner,
	reactivatePartner,
	reissuePartnerActivation,
} from '@/features/admin/partners/services/partner.service'
import { sendPartnerActivationLink } from '@/features/admin/partners/services/partner-notification.service'
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
	phone: null,
	active: true,
	activatedAt: null,
	createdAt: '2026-10-10T12:00:00.000Z',
	status: 'PENDING',
	leader: null,
}

const req = () =>
	new Request('http://localhost/api/admin/partners/21/x', { method: 'POST' })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(requireRole).mockResolvedValue({
		ok: true,
		session: SESSION,
	} as never)
	vi.mocked(deactivatePartner).mockResolvedValue({
		...PARTNER,
		active: false,
		status: 'DEACTIVATED',
	})
	vi.mocked(reactivatePartner).mockResolvedValue(PARTNER)
	vi.mocked(reissuePartnerActivation).mockResolvedValue({
		partner: PARTNER,
		rawToken: 'RAW-SECRET',
	})
	vi.mocked(sendPartnerActivationLink).mockResolvedValue(true)
})

const ROUTES = [
	['deactivate', deactivate, deactivatePartner, 'PARTNER_DEACTIVATED'],
	['reactivate', reactivate, reactivatePartner, 'PARTNER_REACTIVATED'],
	[
		'resend-activation',
		resend,
		reissuePartnerActivation,
		'PARTNER_ACTIVATION_RESENT',
	],
] as const

describe.each(ROUTES)(
	'POST /api/admin/partners/[id]/%s',
	(_name, handler, service, action) => {
		it('requires ADMIN', async () => {
			await handler(req(), params('21'))
			expect(requireRole).toHaveBeenCalledWith(['ADMIN'])
		})

		it.each([401, 403])(
			'returns the guard response (%i) and changes nothing',
			async (status) => {
				vi.mocked(requireRole).mockResolvedValue({
					ok: false,
					response: NextResponse.json(
						{ success: false, error: 'x' },
						{ status }
					),
				} as never)
				const response = await handler(req(), params('21'))
				expect(response.status).toBe(status)
				expect(service).not.toHaveBeenCalled()
				expect(logAuditEvent).not.toHaveBeenCalled()
			}
		)

		it.each(['abc', '0', '-3', '1.5', ''])(
			'rejects invalid id "%s" with 400',
			async (id) => {
				const response = await handler(req(), params(id))
				expect(response.status).toBe(400)
				expect(service).not.toHaveBeenCalled()
			}
		)

		it('audits exactly once with actor, ip, user agent and details [AUD]', async () => {
			const response = await handler(req(), params('21'))
			expect(response.status).toBe(200)
			expect(logAuditEvent).toHaveBeenCalledTimes(1)
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 1,
					action,
					email: 'ana@partner.com',
					ipAddress: '10.0.0.1',
					userAgent: 'vitest-agent',
					details: expect.stringContaining('admin@corp.com'),
				})
			)
		})

		it.each([
			['NOT_FOUND', 404],
			['INVALID_STATE', 409],
		] as const)(
			'maps %s to %i without auditing or mailing',
			async (code, status) => {
				vi.mocked(service as never as (id: number) => Promise<unknown>)
				;(service as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
					new PartnerServiceError(code, 'mensaje')
				)
				const response = await handler(req(), params('21'))
				const body = await response.json()
				expect(response.status).toBe(status)
				expect(body).toEqual({ data: null, error: 'mensaje' })
				expect(logAuditEvent).not.toHaveBeenCalled()
				expect(sendPartnerActivationLink).not.toHaveBeenCalled()
			}
		)

		it('hides unexpected errors behind a generic 500', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {})
			;(service as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('secret')
			)
			const response = await handler(req(), params('21'))
			const body = await response.json()
			expect(response.status).toBe(500)
			expect(JSON.stringify(body)).not.toContain('secret')
			expect(logAuditEvent).not.toHaveBeenCalled()
		})
	}
)

describe('deactivate / reactivate payloads', () => {
	it('deactivate returns the updated partner DTO', async () => {
		const response = await deactivate(req(), params('21'))
		const body = await response.json()
		expect(body.data.status).toBe('DEACTIVATED')
		expect(deactivatePartner).toHaveBeenCalledWith(21)
		expect(sendPartnerActivationLink).not.toHaveBeenCalled()
	})

	it('reactivate returns the updated partner DTO and sends no email', async () => {
		const response = await reactivate(req(), params('21'))
		const body = await response.json()
		expect(body.data.id).toBe(21)
		expect(reactivatePartner).toHaveBeenCalledWith(21)
		expect(sendPartnerActivationLink).not.toHaveBeenCalled()
	})
})

describe('resend-activation', () => {
	it('sends the new link after the token is issued and reports emailSent', async () => {
		const response = await resend(req(), params('21'))
		const body = await response.json()
		expect(body.data).toEqual({ ...PARTNER, emailSent: true })
		expect(JSON.stringify(body)).not.toContain('RAW-SECRET')
		expect(sendPartnerActivationLink).toHaveBeenCalledWith(
			{ name: 'Ana', email: 'ana@partner.com' },
			'RAW-SECRET'
		)
	})

	it('reports emailSent=false (200) when delivery fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(sendPartnerActivationLink).mockRejectedValue(new Error('smtp'))
		const response = await resend(req(), params('21'))
		const body = await response.json()
		expect(response.status).toBe(200)
		expect(body.data.emailSent).toBe(false)
		expect(logAuditEvent).toHaveBeenCalledTimes(1)
	})

	it('does not mail on an ineligible partner (activated or deactivated)', async () => {
		vi.mocked(reissuePartnerActivation).mockRejectedValue(
			new PartnerServiceError('INVALID_STATE', 'El partner ya activó su cuenta')
		)
		const response = await resend(req(), params('21'))
		expect(response.status).toBe(409)
		expect(sendPartnerActivationLink).not.toHaveBeenCalled()
	})
})
