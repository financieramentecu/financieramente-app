import { redirect } from "next/navigation"
import { auth } from "@/auth"

/**
 * Página raíz
 * 
 * Redirige inteligentemente según el estado de autenticación:
 * - Si está autenticado → /dashboard
 * - Si no está autenticado → /login
 */
export default async function Home() {
  const session = await auth()

  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}