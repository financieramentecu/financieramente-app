import { auth as nextAuth } from '@/lib/auth/nextauth'
import { headers } from 'next/headers'

/**
 * Wrapper de auth para permitir bypass en tests E2E
 */
export const auth = async () => {
    // Lógica para bypass en tests E2E
    if (process.env.NODE_ENV !== 'production') {
        try {
            const headersList = await headers()
            // Verificar header y cookie (por si acaso)
            if (headersList.get('x-test-auth') === 'true') {
                console.log('[Auth Wrapper] 🔓 Bypassing auth for E2E test')
                // Retornar sesión mockeada que coincide con e2e/fixtures/auth.ts
                return {
                    user: {
                        name: 'Test User',
                        email: 'test@financieramentecu.com',
                        image: 'https://via.placeholder.com/150',
                        id: 'test-user-id',
                        role: 'AGENTE', // Rol por defecto para tests
                    },
                    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                }
            }
        } catch (error) {
            // headers() no disponible o error al leerlos
        }
    }
    return nextAuth()
}
