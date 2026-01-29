import { handlers } from '@/lib/auth/nextauth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Wrapper para manejar errores en los handlers de NextAuth
 * Previene errores de parsing JSON cuando NextAuth devuelve HTML o redirecciones
 */
async function handleAuthRequest(
	request: NextRequest,
	handler: (req: NextRequest) => Promise<Response>
) {
	try {
		const response = await handler(request)
		return response
	} catch (error) {
		console.error('[NextAuth Handler] Error:', error)
		// Si el error es de parsing JSON, devolver un error JSON válido
		if (error instanceof SyntaxError && error.message.includes('JSON')) {
			return NextResponse.json(
				{ error: 'Error procesando respuesta de autenticación' },
				{ status: 500 }
			)
		}
		// Para otros errores, devolver respuesta JSON válida
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Error desconocido en autenticación',
			},
			{ status: 500 }
		)
	}
}

/**
 * Ruta API de NextAuth
 *
 * Maneja todas las rutas de autenticación:
 * - /api/auth/signin
 * - /api/auth/signout
 * - /api/auth/callback
 * - /api/auth/session
 */
export async function GET(request: NextRequest) {
	return handleAuthRequest(request, handlers.GET)
}

export async function POST(request: NextRequest) {
	return handleAuthRequest(request, handlers.POST)
}
