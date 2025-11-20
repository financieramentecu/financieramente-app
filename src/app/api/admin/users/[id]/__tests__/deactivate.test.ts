import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../deactivate/route'
import { NextRequest } from 'next/server'

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock de NextAuth
vi.mock('@/lib/auth/nextauth', () => ({
  auth: vi.fn(),
}))

// Mock de audit logger
vi.mock('@/lib/auth/audit-logger', () => ({
  logAuditEvent: vi.fn(),
  AuditAction: {
    USER_DEACTIVATED: 'USER_DEACTIVATED',
  },
}))

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/nextauth'

describe('POST /api/admin/users/[id]/deactivate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe desactivar un usuario activo', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'admin@financieramentecu.com',
        name: 'Admin',
      },
    }

    vi.mocked(auth).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof auth>>)

    const mockUser = {
      idUser: 1,
      name: 'Test User',
      email: 'test@financieramentecu.com',
      active: true,
      role: {
        idRole: 2,
        code: 'AGENTE',
      },
    }

    const mockUpdatedUser = {
      idUser: 1,
      name: 'Test User',
      email: 'test@financieramentecu.com',
      active: false,
      role: {
        idRole: 2,
        code: 'AGENTE',
      },
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>)
    vi.mocked(prisma.user.update).mockResolvedValueOnce(mockUpdatedUser as unknown as Awaited<ReturnType<typeof prisma.user.update>>)

    const request = new NextRequest('http://localhost:3000/api/admin/users/1/deactivate', {
      method: 'POST',
    })

    const response = await POST(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.active).toBe(false)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idUser: 1 },
        data: { active: false },
      })
    )
  })

  it('debe retornar 401 si no está autenticado', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/admin/users/1/deactivate', {
      method: 'POST',
    })

    const response = await POST(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('No autorizado')
  })

  it('debe retornar 404 si el usuario no existe', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'admin@financieramentecu.com',
        name: 'Admin',
      },
    }

    vi.mocked(auth).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof auth>>)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/admin/users/999/deactivate', {
      method: 'POST',
    })

    const response = await POST(request, { params: { id: '999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Usuario no encontrado')
  })

  it('debe retornar 400 si el usuario ya está inactivo', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'admin@financieramentecu.com',
        name: 'Admin',
      },
    }

    vi.mocked(auth).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof auth>>)

    const mockUser = {
      idUser: 1,
      name: 'Test User',
      email: 'test@financieramentecu.com',
      active: false,
      role: {
        idRole: 2,
        code: 'AGENTE',
      },
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>)

    const request = new NextRequest('http://localhost:3000/api/admin/users/1/deactivate', {
      method: 'POST',
    })

    const response = await POST(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('El usuario ya está inactivo')
  })
})

