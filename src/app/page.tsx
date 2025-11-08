import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { headers } from "next/headers"

/**
 * Página raíz
 * 
 * Redirige inteligentemente según el estado de autenticación:
 * - Si está autenticado → /dashboard
 * - Si no está autenticado → /login
 * 
 * En modo de prueba, permite acceso con header especial
 */
export default async function Home() {
	// En modo de prueba, permitir acceso si hay un header especial de test
	const headersList = await headers()
	const isTestAuth = headersList.get('x-test-auth') === 'true'

	if (process.env.NODE_ENV !== 'production' && isTestAuth) {
		redirect("/dashboard")
		return
	}

	const session = await auth()

	if (session) {
		redirect("/dashboard")
	} else {
		redirect("/login")
	}
}