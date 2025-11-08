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
	// Solo verificar headers si estamos en un contexto de solicitud (no en tests unitarios)
	let isTestAuth = false
	try {
		const headersList = await headers()
		isTestAuth = headersList.get('x-test-auth') === 'true'
	} catch {
		// headers() no está disponible (por ejemplo, en tests unitarios)
		// Continuar con el flujo normal de autenticación
	}

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