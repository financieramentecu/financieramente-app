import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth/nextauth"

/**
 * Middleware para proteger rutas privadas
 * 
 * Implementa:
 * - Protección de rutas del dashboard
 * - Redirección a login si no está autenticado
 * - Validación de sesión activa
 * 
 * Compatible con NextAuth v5
 */
export async function middleware(request: NextRequest) {
  // Verificar sesión
  const session = await auth()

  // Si no hay sesión y se intenta acceder a una ruta protegida, redirigir a login
  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si hay sesión, permitir acceso
  return NextResponse.next()
}

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

