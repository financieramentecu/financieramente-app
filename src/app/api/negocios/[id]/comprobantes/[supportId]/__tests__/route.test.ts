import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { email: 'agent@example.com', id: '1' },
  }),
}))

vi.mock('@/features/negocios/services/business-access.service', () => ({
  // Ownership is covered by __tests__/business-ownership.routes.test.ts
  assertBusinessAccess: vi.fn().mockResolvedValue({ ok: true, idOwner: 1 }),
}))

vi.mock('@/features/business-supports/services/business-supports.service', () => ({
  deactivateComprobante: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getUserAgent: vi.fn().mockReturnValue('vitest'),
}))

vi.mock('@/features/negocios/services/user-hierarchy.service', () => ({
  resolveVisibleUserIdsForUser: vi.fn().mockResolvedValue([1]),
}))

vi.mock('@/features/negocios/services/user.service', () => ({
  getCurrentUserByEmail: vi.fn().mockResolvedValue({
    idUser: 1,
    email: 'agent@example.com',
    role: { code: 'AGENTE' },
  }),
}))

import { DELETE } from '../route'
import {
  deactivateComprobante,
} from '@/features/business-supports/services/business-supports.service'
import { ComprobanteError } from '@/features/business-supports/types/business-support.types'
import { resolveVisibleUserIdsForUser } from '@/features/negocios/services/user-hierarchy.service'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { assertBusinessAccess } from '@/features/negocios/services/business-access.service'

const mockDeactivate = deactivateComprobante as ReturnType<typeof vi.fn>
const mockResolveVisible = resolveVisibleUserIdsForUser as ReturnType<typeof vi.fn>
const mockUserFind = getCurrentUserByEmail as ReturnType<typeof vi.fn>

function makeDeleteRequest(): Request {
  return new Request('http://localhost/api/negocios/10/comprobantes/supp-1', {
    method: 'DELETE',
  })
}

const routeParams = { params: Promise.resolve({ id: '10', supportId: 'supp-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  mockUserFind.mockResolvedValue({
    idUser: 1,
    email: 'agent@example.com',
    role: { code: 'AGENTE' },
  })
  mockResolveVisible.mockResolvedValue([1])
})

describe('DELETE /api/negocios/[id]/comprobantes/[supportId]', () => {
  it('returns 200 with success true for AGENTE on happy path', async () => {
    mockDeactivate.mockResolvedValue(undefined)

    const res = await DELETE(makeDeleteRequest(), routeParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.success).toBe(true)
    expect(mockResolveVisible).toHaveBeenCalled()
    expect(mockDeactivate).toHaveBeenCalledWith(
      'supp-1',
      expect.any(Object),
      expect.objectContaining({
        businessId: 10,
        visibleUserIds: [1],
      }),
    )
  })

  it('does not scope visibleUserIds for ADMIN', async () => {
    mockUserFind.mockResolvedValue({
      idUser: 1,
      email: 'admin@example.com',
      role: { code: 'ADMIN' },
    })
    mockDeactivate.mockResolvedValue(undefined)

    const res = await DELETE(makeDeleteRequest(), routeParams)

    expect(res.status).toBe(200)
    expect(mockResolveVisible).not.toHaveBeenCalled()
    expect(mockDeactivate).toHaveBeenCalledWith(
      'supp-1',
      expect.any(Object),
      expect.objectContaining({
        businessId: 10,
        visibleUserIds: undefined,
      }),
    )
  })

  it('returns 403 when role cannot delete comprobantes', async () => {
    mockUserFind.mockResolvedValue({
      idUser: 1,
      email: 'default@example.com',
      role: { code: 'DEFAULT' },
    })

    const res = await DELETE(makeDeleteRequest(), routeParams)
    expect(res.status).toBe(403)
    expect(mockDeactivate).not.toHaveBeenCalled()
  })

  it('PARTNER deletes a comprobante of an own business (soft delete, scoped to self)', async () => {
    mockUserFind.mockResolvedValue({
      idUser: 10,
      email: 'partner@example.com',
      role: { code: 'PARTNER' },
    })
    mockResolveVisible.mockResolvedValue([10])

    const res = await DELETE(makeDeleteRequest(), routeParams)

    expect(res.status).toBe(200)
    expect(mockDeactivate).toHaveBeenCalledWith(
      'supp-1',
      expect.objectContaining({ userId: 10, email: 'partner@example.com' }),
      expect.objectContaining({ businessId: 10, visibleUserIds: [10] }),
    )
  })

  it('PARTNER on a business outside their scope gets 404 and nothing is deleted', async () => {
    mockUserFind.mockResolvedValue({
      idUser: 10,
      email: 'partner@example.com',
      role: { code: 'PARTNER' },
    })
    vi.mocked(assertBusinessAccess).mockResolvedValueOnce({
      ok: false,
      reason: 'NOT_FOUND',
    })

    const res = await DELETE(makeDeleteRequest(), routeParams)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toEqual({ data: null, error: 'Negocio no encontrado' })
    expect(mockDeactivate).not.toHaveBeenCalled()
  })

  it('returns 403 for CONSULTOR (read-only) — canDeleteBusinessComprobante already excludes it', async () => {
    mockUserFind.mockResolvedValue({
      idUser: 9,
      email: 'consultor@example.com',
      role: { code: 'CONSULTOR' },
    })

    const res = await DELETE(makeDeleteRequest(), routeParams)
    expect(res.status).toBe(403)
    expect(mockDeactivate).not.toHaveBeenCalled()
  })

  it('returns 404 when service throws NOT_FOUND', async () => {
    mockDeactivate.mockRejectedValue(new ComprobanteError('NOT_FOUND', 'not found'))

    const res = await DELETE(makeDeleteRequest(), routeParams)
    expect(res.status).toBe(404)
  })

  it('returns 403 when service throws FORBIDDEN', async () => {
    mockDeactivate.mockRejectedValue(
      new ComprobanteError('FORBIDDEN', 'No tiene permiso'),
    )

    const res = await DELETE(makeDeleteRequest(), routeParams)
    expect(res.status).toBe(403)
  })

  it('returns clear error message on unexpected failure', async () => {
    mockDeactivate.mockRejectedValue(new Error('network down'))

    const res = await DELETE(makeDeleteRequest(), routeParams)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toMatch(/no se pudo eliminar/i)
  })

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/auth')
    vi.mocked(auth).mockResolvedValueOnce(null)

    const res = await DELETE(makeDeleteRequest(), routeParams)
    expect(res.status).toBe(401)
  })
})
