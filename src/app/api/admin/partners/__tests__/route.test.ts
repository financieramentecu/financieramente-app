import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/auth/require-role', () => ({ requireRole: vi.fn() }))

vi.mock('@/features/admin/partners/services/partner.service', async () => {
	const errors =
		await import('@/features/admin/partners/services/partner-errors')
	return {
		PartnerServiceError: errors.PartnerServiceError,
		createPartner: vi.fn(),
		listPartners: vi.fn(),
	}
})

vi.mock(
	'@/features/admin/partners/services/partner-notification.service',
	() => ({ sendPartnerActivationLink: vi.fn() })
)

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		PARTNER_CREATED: 'PARTNER_CREATED',
	},
	getClientIp: vi.fn(() => '10.0.0.1'),
	getUserAgent: vi.fn(() => 'vitest-agent'),
}))

import { GET, POST } from '../route'
import { requireRole } from '@/lib/auth/require-role'
import {
	PartnerServiceError,
	createPartner,
	listPartners,
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
	leader: {
		id: 10,
		name: 'Luis',
		lastName: 'Pérez',
		email: 'l@corp.com',
		levelCode: 'LEVEL_2',
	},
}

const BODY = {
	name: 'Ana',
	lastName: 'Gómez',
	typeIdentity: 'CC',
	identityNumber: '1020304050',
	email: 'Ana@Partner.com',
	leaderId: 10,
}

function post(body: unknown, raw = false) {
	return new Request('http://localhost/api/admin/partners', {
		method: 'POST',
		body: raw ? (body as string) : JSON.stringify(body),
	})
}

function asAdmin() {
	vi.mocked(requireRole).mockResolvedValue({
		ok: true,
		session: SESSION,
	} as never)
}

beforeEach(() => {
	vi.clearAllMocks()
	asAdmin()
	vi.mocked(createPartner).mockResolvedValue({
		partner: PARTNER,
		rawToken: 'RAW-SECRET',
	})
	vi.mocked(sendPartnerActivationLink).mockResolvedValue(true)
})

describe('authorization (ADM-02, PM-01)', () => {
	it('requires the ADMIN role on every method', async () => {
		await GET()
		await POST(post(BODY))
		expect(requireRole).toHaveBeenCalledTimes(2)
		for (const call of vi.mocked(requireRole).mock.calls) {
			expect(call[0]).toEqual(['ADMIN'])
		}
	})

	it.each([401, 403])(
		'returns the guard response (%i) and does nothing else',
		async (status) => {
			vi.mocked(requireRole).mockResolvedValue({
				ok: false,
				response: NextResponse.json({ success: false, error: 'x' }, { status }),
			} as never)

			const postResponse = await POST(post(BODY))
			const getResponse = await GET()

			expect(postResponse.status).toBe(status)
			expect(getResponse.status).toBe(status)
			expect(createPartner).not.toHaveBeenCalled()
			expect(listPartners).not.toHaveBeenCalled()
			expect(sendPartnerActivationLink).not.toHaveBeenCalled()
			expect(logAuditEvent).not.toHaveBeenCalled()
		}
	)
})

describe('GET /api/admin/partners', () => {
	it('returns { data: PartnerDto[] }', async () => {
		vi.mocked(listPartners).mockResolvedValue([PARTNER])
		const response = await GET()
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ data: [PARTNER] })
	})

	it('returns a generic 500 on unexpected errors', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(listPartners).mockRejectedValue(new Error('db password leaked'))
		const response = await GET()
		const body = await response.json()
		expect(response.status).toBe(500)
		expect(body).toEqual({ data: null, error: 'Error al listar partners' })
	})
})

describe('POST /api/admin/partners', () => {
	it('creates, sends the activation email after commit and audits (201)', async () => {
		const response = await POST(post(BODY))
		const body = await response.json()

		expect(response.status).toBe(201)
		expect(body.data).toEqual({ ...PARTNER, emailSent: true })
		expect(JSON.stringify(body)).not.toContain('RAW-SECRET')

		// Validated + normalized input reaches the service.
		expect(createPartner).toHaveBeenCalledWith({
			name: 'Ana',
			lastName: 'Gómez',
			typeIdentity: 'CC',
			identityNumber: '1020304050',
			email: 'ana@partner.com',
			phone: undefined,
			leaderId: 10,
		})
		expect(sendPartnerActivationLink).toHaveBeenCalledWith(
			{ name: 'Ana', email: 'ana@partner.com' },
			'RAW-SECRET'
		)
		const mailOrder = vi.mocked(sendPartnerActivationLink).mock
			.invocationCallOrder[0]
		expect(mailOrder).toBeGreaterThan(
			vi.mocked(createPartner).mock.invocationCallOrder[0]
		)
	})

	it('writes exactly one PARTNER_CREATED audit event with actor, ip, user agent and details [AUD]', async () => {
		await POST(post(BODY))
		expect(logAuditEvent).toHaveBeenCalledTimes(1)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 1,
				action: 'PARTNER_CREATED',
				email: 'ana@partner.com',
				ipAddress: '10.0.0.1',
				userAgent: 'vitest-agent',
				details: expect.stringContaining('admin@corp.com'),
			})
		)
		const details = vi.mocked(logAuditEvent).mock.calls[0][0].details
		expect(details).not.toContain('RAW-SECRET')
	})

	it.each([
		[
			'returns false',
			() => vi.mocked(sendPartnerActivationLink).mockResolvedValue(false),
		],
		[
			'throws',
			() =>
				vi
					.mocked(sendPartnerActivationLink)
					.mockRejectedValue(new Error('smtp down')),
		],
	])(
		'still answers 201 with emailSent=false when the mail %s (no rollback)',
		async (_label, arrange) => {
			vi.spyOn(console, 'error').mockImplementation(() => {})
			arrange()
			const response = await POST(post(BODY))
			const body = await response.json()
			expect(response.status).toBe(201)
			expect(body.data.emailSent).toBe(false)
			expect(logAuditEvent).toHaveBeenCalledTimes(1)
		}
	)

	it('returns 400 with the first Spanish message for an invalid body', async () => {
		const response = await POST(post({ ...BODY, leaderId: undefined }))
		const body = await response.json()
		expect(response.status).toBe(400)
		expect(body).toMatchObject({ data: null, error: 'Selecciona un líder' })
		expect(createPartner).not.toHaveBeenCalled()
	})

	it('returns 400 for a malformed JSON body', async () => {
		const response = await POST(post('{not json', true))
		expect(response.status).toBe(400)
		expect(createPartner).not.toHaveBeenCalled()
	})

	it('ignores client-supplied role/level/category/state', async () => {
		await POST(
			post({ ...BODY, roleId: 1, levelId: 2, categoryId: 3, active: false })
		)
		const input = vi.mocked(createPartner).mock.calls[0][0]
		expect(input).not.toHaveProperty('roleId')
		expect(input).not.toHaveProperty('levelId')
		expect(input).not.toHaveProperty('categoryId')
		expect(input).not.toHaveProperty('active')
	})

	it.each([
		['EMAIL_TAKEN', 409, 'email'],
		['IDENTITY_TAKEN', 409, 'identityNumber'],
		['INVALID_LEADER', 400, 'leaderId'],
	] as const)(
		'maps %s to %i with the field-level message, no mail, no audit',
		async (code, status, field) => {
			vi.mocked(createPartner).mockRejectedValue(
				new PartnerServiceError(code, 'mensaje de dominio', field)
			)
			const response = await POST(post(BODY))
			const body = await response.json()
			expect(response.status).toBe(status)
			expect(body).toMatchObject({
				data: null,
				error: 'mensaje de dominio',
				details: { field },
			})
			expect(sendPartnerActivationLink).not.toHaveBeenCalled()
			expect(logAuditEvent).not.toHaveBeenCalled()
		}
	)

	it('surfaces missing reference data with the seed hint (500)', async () => {
		vi.mocked(createPartner).mockRejectedValue(
			new PartnerServiceError(
				'REFERENCE_DATA_MISSING',
				'Ejecuta npm run prisma:seed:partner'
			)
		)
		const response = await POST(post(BODY))
		const body = await response.json()
		expect(response.status).toBe(500)
		expect(body.error).toContain('npm run prisma:seed:partner')
	})

	it('hides unexpected error details behind a generic 500', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(createPartner).mockRejectedValue(
			new Error('connection string xyz')
		)
		const response = await POST(post(BODY))
		const body = await response.json()
		expect(response.status).toBe(500)
		expect(body).toEqual({ data: null, error: 'Error al crear el partner' })
		expect(sendPartnerActivationLink).not.toHaveBeenCalled()
	})
})
