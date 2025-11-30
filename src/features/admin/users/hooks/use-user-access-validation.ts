import { useMemo } from 'react'
import type { User } from '../types/user.types'
import {
    hasNoRole,
    hasDefaultRole,
    isInactive,
    hasAccessIssue,
    getAccessIssues,
} from '../utils/user-access.utils'

/**
 * Hook para validar el acceso de un usuario al sistema
 * Encapsula toda la lógica de validación de acceso
 *
 * @param user - Usuario a validar
 * @returns Información sobre el acceso del usuario
 */
export function useUserAccessValidation(user: User | null | undefined) {
    const validation = useMemo(() => {
        return {
            hasNoRole: hasNoRole(user),
            hasDefaultRole: hasDefaultRole(user),
            isInactive: isInactive(user),
            hasAccessIssue: hasAccessIssue(user),
            accessIssues: getAccessIssues(user),
        }
    }, [user])

    return validation
}
