import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { NextRequest } from 'next/server'

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
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
    USER_ACTIVATED: 'USER_ACTIVATED',
    USER_DEACTIVATED: 'USER_DEACTIVATED',
    ROLE_CHANGED: 'ROLE_CHANGED',
  },
}))

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/nextauth'

describe('PUT /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe actualizar el rol de un usuario', async () => {
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
      idRole: 1,
      role: {
        idRole: 1,
        code: 'DEFAULT',
      },
    }

    const mockRole = {
      idRole: 2,
      code: 'AGENTE',
      name: 'Agente',
    }

    const mockUpdatedUser = {
      idUser: 1,
      name: 'Test User',
      email: 'test@financieramentecu.com',
      active: true,
      idRole: 2,
      role: mockRole,
      typeUser: null,
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>)
    vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockRole as unknown as Awaited<ReturnType<typeof prisma.role.findUnique>>)
    vi.mocked(prisma.user.update).mockResolvedValueOnce(mockUpdatedUser as unknown as Awaited<ReturnType<typeof prisma.user.update>>)

    const request = new NextRequest('http://localhost:3000/api/admin/users/1', {
      method: 'PUT',
      body: JSON.stringify({ roleId: 2 }),
    })

    const response = await PUT(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.role.code).toBe('AGENTE')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idUser: 1 },
        data: expect.objectContaining({
          idRole: 2,
        }),
      })
    )
  })

  it('debe actualizar el estado de un usuario', async () => {
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
      idRole: 2,
      role: {
        idRole: 2,
        code: 'AGENTE',
      },
    }

    const mockUpdatedUser = {
      ...mockUser,
      active: false,
      typeUser: null,
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>)
    vi.mocked(prisma.user.update).mockResolvedValueOnce(mockUpdatedUser as unknown as Awaited<ReturnType<typeof prisma.user.update>>)

    const request = new NextRequest('http://localhost:3000/api/admin/users/1', {
      method: 'PUT',
      body: JSON.stringify({ active: false }),
    })

    const response = await PUT(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.active).toBe(false)
  })

  it('debe retornar 401 si no está autenticado', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/admin/users/1', {
      method: 'PUT',
      body: JSON.stringify({ roleId: 2 }),
    })

    const response = await PUT(request, { params: { id: '1' } })
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

    const request = new NextRequest('http://localhost:3000/api/admin/users/999', {
      method: 'PUT',
      body: JSON.stringify({ roleId: 2 }),
    })

    const response = await PUT(request, { params: { id: '999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Usuario no encontrado')
  })
})

