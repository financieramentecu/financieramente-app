import type { User } from '../types/user.types'
import { UserRole } from '@/lib/auth/roles'

/**
 * Verifica si el usuario no tiene un rol asignado
 */
export function hasNoRole(user: User | null | undefined): boolean {
    return !user?.role
}

/**
 * Verifica si el usuario tiene el rol DEFAULT
 */
export function hasDefaultRole(user: User | null | undefined): boolean {
    return user?.role?.code === UserRole.DEFAULT
}

/**
 * Verifica si el usuario está inactivo
 */
export function isInactive(user: User | null | undefined): boolean {
    return user?.active === false
}

/**
 * Verifica si el usuario tiene algún problema de acceso
 */
export function hasAccessIssue(user: User | null | undefined): boolean {
    return hasNoRole(user) || hasDefaultRole(user) || isInactive(user)
}

/**
 * Obtiene la lista de problemas de acceso del usuario
 */
export function getAccessIssues(user: User | null | undefined): string[] {
    const issues: string[] = []

    if (isInactive(user)) {
        issues.push('El usuario está inactivo y no puede iniciar sesión')
    }

    if (hasNoRole(user)) {
        issues.push('El usuario no tiene un rol asignado')
    }

    if (hasDefaultRole(user)) {
        issues.push('El usuario tiene el rol DEFAULT que no permite acceso al sistema')
    }

    return issues
}

/**
 * Verifica si un rol específico es el rol DEFAULT
 */
export function isDefaultRole(roleCode: string | null | undefined): boolean {
    return roleCode === UserRole.DEFAULT
}
