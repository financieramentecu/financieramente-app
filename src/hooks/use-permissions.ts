"use client"

import { useSession } from "next-auth/react"
import { UserRole } from "@/lib/auth/roles"
import { RolePermissions, getRolePermissions, hasPermission, hasNestedPermission } from "@/lib/auth/permissions"

/**
 * Hook para acceder a permisos del usuario actual
 */
export function usePermissions() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const permissions = session?.user?.permissions || getRolePermissions(role || null)

  return {
    role: role as UserRole | null | undefined,
    permissions: permissions as RolePermissions | null,
    hasPermission: (permission: keyof RolePermissions) => hasPermission(role, permission),
    hasNestedPermission: (category: keyof RolePermissions, permission: string) =>
      hasNestedPermission(role, category, permission),
  }
}



