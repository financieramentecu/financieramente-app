import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUserAutomatically } from '../user-creation'
import { UserRole } from '../roles'
import * as auditLogger from '../audit-logger'

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    typeUser: {
      findFirst: vi.fn(),
    },
  },
}))

// Mock de audit logger
vi.mock('../audit-logger', () => ({
  logAuditEvent: vi.fn(),
  AuditAction: {
    USER_CREATED: 'USER_CREATED',
  },
}))

import { prisma } from '@/lib/prisma'

describe('createUserAutomatically', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe crear un usuario nuevo con estado Inactivo y rol Default', async () => {
    const params = {
      email: 'test@financieramentecu.com',
      name: 'Test User',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    }

    // Mock: usuario no existe
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    // Mock: rol Default existe
    vi.mocked(prisma.role.findUnique).mockResolvedValueOnce({
      idRole: 1,
      code: UserRole.DEFAULT,
      name: 'Default',
      description: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    // Mock: TypeUser existe
    vi.mocked(prisma.typeUser.findFirst).mockResolvedValueOnce({
      idTypeUser: 1,
      nombre: 'Test Type',
      nivelJerarquico: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    // Mock: creación exitosa
    const createdUser = {
      idUser: 1,
      name: 'Test',
      lastName: 'User',
      email: params.email,
      active: false,
      idRole: 1,
    }
    vi.mocked(prisma.user.create).mockResolvedValueOnce(createdUser as any)

    const result = await createUserAutomatically(params)

    expect(result.success).toBe(true)
    expect(result.userId).toBe(1)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: params.email,
        active: false,
        idRole: 1,
      }),
    })
    expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: 'USER_CREATED',
        email: params.email,
      })
    )
  })

  it('debe retornar el usuario existente si ya existe', async () => {
    const params = {
      email: 'existing@financieramentecu.com',
      name: 'Existing User',
    }

    // Mock: usuario ya existe
    const existingUser = {
      idUser: 2,
      email: params.email,
      name: 'Existing',
      lastName: 'User',
      active: true,
      role: {
        idRole: 2,
        code: UserRole.AGENTE,
      },
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(existingUser as any)

    const result = await createUserAutomatically(params)

    expect(result.success).toBe(true)
    expect(result.userId).toBe(2)
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(auditLogger.logAuditEvent).not.toHaveBeenCalled()
  })

  it('debe retornar error si el rol Default no existe', async () => {
    const params = {
      email: 'test@financieramentecu.com',
      name: 'Test User',
    }

    // Mock: usuario no existe
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    // Mock: rol Default no existe
    vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(null)

    const result = await createUserAutomatically(params)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Rol Default no encontrado')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('debe retornar error si no hay TypeUser disponible', async () => {
    const params = {
      email: 'test@financieramentecu.com',
      name: 'Test User',
    }

    // Mock: usuario no existe
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    // Mock: rol Default existe
    vi.mocked(prisma.role.findUnique).mockResolvedValueOnce({
      idRole: 1,
      code: UserRole.DEFAULT,
      name: 'Default',
      description: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    // Mock: TypeUser no existe
    vi.mocked(prisma.typeUser.findFirst).mockResolvedValueOnce(null)

    const result = await createUserAutomatically(params)

    expect(result.success).toBe(false)
    expect(result.error).toContain('No hay TypeUser disponible')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('debe manejar condiciones de carrera (usuario creado por otro proceso)', async () => {
    const params = {
      email: 'race@financieramentecu.com',
      name: 'Race Condition User',
    }

    // Mock: usuario no existe inicialmente
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    // Mock: rol Default existe
    vi.mocked(prisma.role.findUnique).mockResolvedValueOnce({
      idRole: 1,
      code: UserRole.DEFAULT,
      name: 'Default',
      description: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    // Mock: TypeUser existe
    vi.mocked(prisma.typeUser.findFirst).mockResolvedValueOnce({
      idTypeUser: 1,
      nombre: 'Test Type',
      nivelJerarquico: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    // Mock: error de duplicado al crear
    const duplicateError = new Error('Unique constraint')
    duplicateError.code = 'P2002'
    vi.mocked(prisma.user.create).mockRejectedValueOnce(duplicateError)

    // Mock: usuario existe después del error
    const existingUser = {
      idUser: 3,
      email: params.email,
      name: 'Race',
      lastName: 'Condition User',
      active: false,
      role: {
        idRole: 1,
        code: UserRole.DEFAULT,
      },
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(existingUser as any)

    const result = await createUserAutomatically(params)

    expect(result.success).toBe(true)
    expect(result.userId).toBe(3)
    expect(auditLogger.logAuditEvent).not.toHaveBeenCalled()
  })

  it('debe extraer correctamente nombre y apellido', async () => {
    const params = {
      email: 'fullname@financieramentecu.com',
      name: 'John Doe Smith',
    }

    // Mock: usuario no existe
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    // Mock: rol Default existe
    vi.mocked(prisma.role.findUnique).mockResolvedValueOnce({
      idRole: 1,
      code: UserRole.DEFAULT,
      name: 'Default',
      description: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    // Mock: TypeUser existe
    vi.mocked(prisma.typeUser.findFirst).mockResolvedValueOnce({
      idTypeUser: 1,
      nombre: 'Test Type',
      nivelJerarquico: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    // Mock: creación exitosa
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      idUser: 4,
      name: 'John',
      lastName: 'Doe Smith',
      email: params.email,
      active: false,
    } as any)

    await createUserAutomatically(params)

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'John',
        lastName: 'Doe Smith',
      }),
    })
  })
})

