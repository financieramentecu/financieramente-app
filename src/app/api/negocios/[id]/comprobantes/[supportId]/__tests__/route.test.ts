import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { email: 'agent@example.com', id: '1' },
  }),
}))

vi.mock('@/features/business-supports/services/business-supports.service', () => ({
  deactivateComprobante: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getUserAgent: vi.fn().mockReturnValue('vitest'),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ idUser: 1, email: 'agent@example.com' }),
    },
  },
}))

import { DELETE } from '../route'
import {
  deactivateComprobante,
} from '@/features/business-supports/services/business-supports.service'
import { ComprobanteError } from '@/features/business-supports/types/business-support.types'

const mockDeactivate = deactivateComprobante as ReturnType<typeof vi.fn>

function makeDeleteRequest(): Request {
  return new Request('http://localhost/api/negocios/10/comprobantes/supp-1', {
    method: 'DELETE',
  })
}

const routeParams = { params: Promise.resolve({ id: '10', supportId: 'supp-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DELETE /api/negocios/[id]/comprobantes/[supportId]', () => {
  it('returns 200 with success true on happy path', async () => {
    mockDeactivate.mockResolvedValue(undefined)

    const res = await DELETE(makeDeleteRequest(), routeParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.success).toBe(true)
    expect(mockDeactivate).toHaveBeenCalledWith('supp-1', expect.any(Object))
  })

  it('returns 404 when service throws NOT_FOUND', async () => {
    mockDeactivate.mockRejectedValue(new ComprobanteError('NOT_FOUND', 'not found'))

    const res = await DELETE(makeDeleteRequest(), routeParams)
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/auth')
    vi.mocked(auth).mockResolvedValueOnce(null)

    const res = await DELETE(makeDeleteRequest(), routeParams)
    expect(res.status).toBe(401)
  })
})
