import { redirect } from "next/navigation"

/**
 * Página de Dashboard (Ruta Privada)
 * 
 * Redirige a la página de negocios por defecto
 */
export default function DashboardPage() {
  redirect("/dashboard/negocios")
}

