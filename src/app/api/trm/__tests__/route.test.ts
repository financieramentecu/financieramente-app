import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { auth } from '@/auth'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

const mockAuth = vi.mocked(auth)

// Mock global fetch for dolarapi proxy tests
let originalFetch: typeof global.fetch
beforeEach(() => {
  originalFetch = global.fetch
  vi.clearAllMocks()
})
afterEach(() => {
  global.fetch = originalFetch
})

import { GET } from '@/app/api/trm/route'

describe('GET /api/trm', () => {
  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.data).toBeNull()
    expect(body.error).toBeDefined()
  })

  it('proxies dolarapi response on 200', async () => {
    mockAuth.mockResolvedValue({
      user: { email: 'user@test.com' },
      expires: '2099-01-01',
    } as unknown as Awaited<ReturnType<typeof auth>>)

    const dolarapiPayload = {
      valor: 4050,
      nombre: 'Dólar estadounidense',
      unidad: 'USD',
      fechaActualizacion: '2025-05-27T00:00:00.000Z',
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => dolarapiPayload,
    } as Response)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.valor).toBe(4050)
    expect(body.data.fetchedAt).toBeDefined()
  })

  it('returns 502 when dolarapi responds with non-200', async () => {
    mockAuth.mockResolvedValue({
      user: { email: 'user@test.com' },
      expires: '2099-01-01',
    } as unknown as Awaited<ReturnType<typeof auth>>)

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.data).toBeNull()
    expect(body.error).toBeDefined()
  })

  it('returns 502 on network error / timeout', async () => {
    mockAuth.mockResolvedValue({
      user: { email: 'user@test.com' },
      expires: '2099-01-01',
    } as unknown as Awaited<ReturnType<typeof auth>>)

    global.fetch = vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.data).toBeNull()
  })
})
