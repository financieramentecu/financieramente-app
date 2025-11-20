import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}))

// Mock de NextAuth
vi.mock('@/lib/auth/nextauth', () => ({
  auth: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/nextauth'

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar lista de usuarios con filtros', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'admin@financieramentecu.com',
        name: 'Admin',
        role: 'ASISTENTE_GERENCIA_OPERATIVA',
      },
    }

    vi.mocked(auth).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof auth>>)

    const mockUsers = [
      {
        idUser: 1,
        name: 'Test User',
        lastName: 'Test',
        email: 'test@financieramentecu.com',
        active: true,
        createdAt: new Date('2024-01-01'),
        role: {
          idRole: 2,
          code: 'AGENTE',
          name: 'Agente',
        },
        typeUser: {
          idTypeUser: 1,
          nombre: 'Test Type',
        },
      },
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockUsers as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>)
    vi.mocked(prisma.auditLog.findMany).mockResolvedValueOnce([])

    const request = new NextRequest('http://localhost:3000/api/admin/users?status=active&role=AGENTE&search=test')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    expect(prisma.user.findMany).toHaveBeenCalled()
    const callArgs = vi.mocked(prisma.user.findMany).mock.calls[0][0]
    expect(callArgs.where).toMatchObject({
      active: true,
      role: {
        code: 'AGENTE',
      },
      OR: expect.arrayContaining([
        { name: { contains: 'test', mode: 'insensitive' } },
        { email: { contains: 'test', mode: 'insensitive' } },
      ]),
    })
  })

  it('debe retornar 401 si no está autenticado', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/admin/users')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('No autorizado')
    expect(prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('debe incluir último acceso desde audit_log', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'admin@financieramentecu.com',
        name: 'Admin',
      },
    }

    vi.mocked(auth).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof auth>>)

    const mockUsers = [
      {
        idUser: 1,
        name: 'Test User',
        lastName: null,
        email: 'test@financieramentecu.com',
        active: true,
        createdAt: new Date('2024-01-01'),
        role: null,
        typeUser: null,
      },
    ]

    const mockLastLogins = [
      {
        idUser: 1,
        createdAt: new Date('2024-01-15'),
      },
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockUsers as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>)
    vi.mocked(prisma.auditLog.findMany).mockResolvedValueOnce(mockLastLogins as unknown as Awaited<ReturnType<typeof prisma.auditLog.findMany>>)

    const request = new NextRequest('http://localhost:3000/api/admin/users')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data[0].lastLogin).toBeDefined()
  })

  it('debe manejar errores correctamente', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'admin@financieramentecu.com',
        name: 'Admin',
      },
    }

    vi.mocked(auth).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof auth>>)
    vi.mocked(prisma.user.findMany).mockRejectedValueOnce(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/admin/users')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Error al listar usuarios')
  })
})

