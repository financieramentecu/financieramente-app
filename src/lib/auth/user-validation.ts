import { prisma } from '@/lib/prisma'
import { UserRole } from './roles'

/**
 * Resultado de validación de usuario
 */
export interface UserValidationResult {
  isValid: boolean
  user: {
    id: number
    email: string
    name: string
    active: boolean
    role: UserRole | null
  } | null
  error?: 'USER_NOT_FOUND' | 'USER_INACTIVE' | 'NO_ROLE'
}

/**
 * Valida y obtiene información del usuario por email
 */
export async function validateUserByEmail(email: string): Promise<UserValidationResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    })

    if (!user) {
      return {
        isValid: false,
        user: null,
        error: 'USER_NOT_FOUND',
      }
    }

    if (!user.active) {
      return {
        isValid: false,
        user: {
          id: user.idUser,
          email: user.email || '',
          name: user.name,
          active: user.active,
          role: user.role?.code as UserRole | null || null,
        },
        error: 'USER_INACTIVE',
      }
    }

    if (!user.role) {
      return {
        isValid: false,
        user: {
          id: user.idUser,
          email: user.email || '',
          name: user.name,
          active: user.active,
          role: null,
        },
        error: 'NO_ROLE',
      }
    }

    // Bloquear usuarios con rol DEFAULT (requieren activación y asignación de rol)
    if (user.role.code === UserRole.DEFAULT) {
      return {
        isValid: false,
        user: {
          id: user.idUser,
          email: user.email || '',
          name: user.name,
          active: user.active,
          role: user.role.code as UserRole,
        },
        error: 'USER_INACTIVE', // Tratarlo como inactivo para mostrar mensaje correcto
      }
    }

    return {
      isValid: true,
      user: {
        id: user.idUser,
        email: user.email || '',
        name: user.name,
        active: user.active,
        role: user.role.code as UserRole,
      },
    }
  } catch (error) {
    console.error('Error validating user:', error)
    return {
      isValid: false,
      user: null,
      error: 'USER_NOT_FOUND',
    }
  }
}

/**
 * Obtiene el rol de un usuario por email
 */
export async function getUserRoleByEmail(email: string): Promise<UserRole | null> {
  const validation = await validateUserByEmail(email)
  return validation.user?.role || null
}



