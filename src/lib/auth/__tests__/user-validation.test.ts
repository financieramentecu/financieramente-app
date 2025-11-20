import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateUserByEmail, getUserRoleByEmail } from '../user-validation'
import { UserRole } from '../roles'

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('validateUserByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar válido para usuario activo con rol', async () => {
    const email = 'active@financieramentecu.com'
    const mockUser = {
      idUser: 1,
      email,
      name: 'Active User',
      active: true,
      role: {
        idRole: 2,
        code: UserRole.AGENTE,
        name: 'Agente',
        description: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any)

    const result = await validateUserByEmail(email)

    expect(result.isValid).toBe(true)
    expect(result.user).toEqual({
      id: 1,
      email,
      name: 'Active User',
      active: true,
      role: UserRole.AGENTE,
    })
    expect(result.error).toBeUndefined()
  })

  it('debe retornar inválido si el usuario no existe', async () => {
    const email = 'notfound@financieramentecu.com'

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    const result = await validateUserByEmail(email)

    expect(result.isValid).toBe(false)
    expect(result.user).toBeNull()
    expect(result.error).toBe('USER_NOT_FOUND')
  })

  it('debe retornar inválido si el usuario está inactivo', async () => {
    const email = 'inactive@financieramentecu.com'
    const mockUser = {
      idUser: 2,
      email,
      name: 'Inactive User',
      active: false,
      role: {
        idRole: 2,
        code: UserRole.AGENTE,
        name: 'Agente',
        description: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any)

    const result = await validateUserByEmail(email)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('USER_INACTIVE')
    expect(result.user).toEqual({
      id: 2,
      email,
      name: 'Inactive User',
      active: false,
      role: UserRole.AGENTE,
    })
  })

  it('debe retornar inválido si el usuario no tiene rol', async () => {
    const email = 'norole@financieramentecu.com'
    const mockUser = {
      idUser: 3,
      email,
      name: 'No Role User',
      active: true,
      role: null,
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any)

    const result = await validateUserByEmail(email)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('NO_ROLE')
    expect(result.user).toEqual({
      id: 3,
      email,
      name: 'No Role User',
      active: true,
      role: null,
    })
  })

  it('debe retornar inválido si el usuario tiene rol DEFAULT', async () => {
    const email = 'default@financieramentecu.com'
    const mockUser = {
      idUser: 4,
      email,
      name: 'Default Role User',
      active: true,
      role: {
        idRole: 1,
        code: UserRole.DEFAULT,
        name: 'Default',
        description: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any)

    const result = await validateUserByEmail(email)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('USER_INACTIVE') // Tratado como inactivo
    expect(result.user).toEqual({
      id: 4,
      email,
      name: 'Default Role User',
      active: true,
      role: UserRole.DEFAULT,
    })
  })

  it('debe manejar errores de base de datos', async () => {
    const email = 'error@financieramentecu.com'

    vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error('Database error'))

    const result = await validateUserByEmail(email)

    expect(result.isValid).toBe(false)
    expect(result.user).toBeNull()
    expect(result.error).toBe('USER_NOT_FOUND')
  })
})

describe('getUserRoleByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar el rol del usuario válido', async () => {
    const email = 'user@financieramentecu.com'
    const mockUser = {
      idUser: 1,
      email,
      name: 'Test User',
      active: true,
      role: {
        idRole: 2,
        code: UserRole.ANALISTA_SOPORTE,
        name: 'Analista de Soporte',
        description: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any)

    const role = await getUserRoleByEmail(email)

    expect(role).toBe(UserRole.ANALISTA_SOPORTE)
  })

  it('debe retornar null si el usuario no es válido', async () => {
    const email = 'invalid@financieramentecu.com'

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    const role = await getUserRoleByEmail(email)

    expect(role).toBeNull()
  })
})

