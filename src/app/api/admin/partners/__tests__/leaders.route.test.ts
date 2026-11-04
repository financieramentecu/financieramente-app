import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/auth/require-role', () => ({ requireRole: vi.fn() }))

vi.mock('@/features/admin/partners/services/partner.service', async () => {
	const errors =
		await import('@/features/admin/partners/services/partner-errors')
	return {
		PartnerServiceError: errors.PartnerServiceError,
		listLeaderCandidates: vi.fn(),
		listLeaderLevels: vi.fn(),
	}
})

import { GET as getLeaders } from '../leaders/route'
import { GET as getLeaderLevels } from '../leader-levels/route'
import { requireRole } from '@/lib/auth/require-role'
import {
	listLeaderCandidates,
	listLeaderLevels,
} from '@/features/admin/partners/services/partner.service'

const SESSION = { user: { id: '1', email: 'admin@corp.com', role: 'ADMIN' } }
const get = (qs: string) =>
	new Request(`http://localhost/api/admin/partners/leaders${qs}`)

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(requireRole).mockResolvedValue({
		ok: true,
		session: SESSION,
	} as never)
	vi.mocked(listLeaderCandidates).mockResolvedValue([
		{ id: 3, name: 'Luis', lastName: null, email: 'l@c.com' },
	])
	vi.mocked(listLeaderLevels).mockResolvedValue([
		{ code: 'LEVEL_1', name: 'Nivel 1' },
	])
})

describe('GET /api/admin/partners/leaders', () => {
	it('requires ADMIN and passes the guard response through', async () => {
		vi.mocked(requireRole).mockResolvedValue({
			ok: false,
			response: NextResponse.json(
				{ success: false, error: 'x' },
				{ status: 403 }
			),
		} as never)
		const response = await getLeaders(get('?levelCode=LEVEL_1'))
		expect(response.status).toBe(403)
		expect(requireRole).toHaveBeenCalledWith(['ADMIN'])
		expect(listLeaderCandidates).not.toHaveBeenCalled()
	})

	it('returns the candidates of the requested level', async () => {
		const response = await getLeaders(get('?levelCode=LEVEL_3'))
		const body = await response.json()
		expect(response.status).toBe(200)
		expect(body.data).toHaveLength(1)
		expect(listLeaderCandidates).toHaveBeenCalledWith('LEVEL_3')
	})

	it.each([
		'',
		'?levelCode=',
		'?levelCode=LEVEL_0',
		'?levelCode=GENERAL_LEVEL',
		'?levelCode=PARTNER_EXTERNAL',
		'?levelCode=level_1',
		'?levelCode=LEVEL_6',
	])('rejects %s with 400 without querying', async (qs) => {
		const response = await getLeaders(get(qs))
		const body = await response.json()
		expect(response.status).toBe(400)
		expect(body).toMatchObject({ data: null, error: 'Nivel de líder inválido' })
		expect(listLeaderCandidates).not.toHaveBeenCalled()
	})
})

describe('GET /api/admin/partners/leader-levels', () => {
	it('requires ADMIN', async () => {
		vi.mocked(requireRole).mockResolvedValue({
			ok: false,
			response: NextResponse.json(
				{ success: false, error: 'x' },
				{ status: 401 }
			),
		} as never)
		const response = await getLeaderLevels()
		expect(response.status).toBe(401)
		expect(listLeaderLevels).not.toHaveBeenCalled()
	})

	it('returns code + display name', async () => {
		const response = await getLeaderLevels()
		expect(await response.json()).toEqual({
			data: [{ code: 'LEVEL_1', name: 'Nivel 1' }],
		})
	})
})
