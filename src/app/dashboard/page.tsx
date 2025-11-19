import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getRedirectUrlByRole } from "@/lib/navigation/menu-builder"
import { UserRole } from "@/lib/auth/roles"

/**
 * Página de Dashboard (Ruta Privada)
 * 
 * Redirige según el rol del usuario:
 * - Agente → /dashboard/agente
 * - Otros → /dashboard/negocios
 * - Usuarios inactivos o con rol DEFAULT → /access-denied
 */
export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar si el usuario tiene rol DEFAULT o está inactivo
  if (session.user.role === UserRole.DEFAULT) {
    redirect("/access-denied?reason=default_role")
  }

  const redirectUrl = getRedirectUrlByRole(session.user.role)
  redirect(redirectUrl === "/dashboard" ? "/dashboard/negocios" : redirectUrl)
}
