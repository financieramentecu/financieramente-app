import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

/**
 * Middleware para proteger rutas privadas
 * 
 * Implementa:
 * - Protección de rutas del dashboard
 * - Redirección a login si no está autenticado
 * - Validación de sesión activa
 */
export default withAuth(
  function middleware(req) {
    // Aquí puedes agregar lógica adicional si es necesario
    // Por ejemplo, validar roles, permisos, etc.
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Verificar que exista un token válido
        return !!token
      },
    },
    pages: {
      signIn: "/login",
    },
  }
)

/**
 * Configuración de rutas protegidas
 * Todas las rutas bajo /dashboard requieren autenticación
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/protected/:path*",
  ],
}

