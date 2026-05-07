/**
 * Prisma Client Singleton
 *
 * ⚠️ CRÍTICO: Este módulo SOLO debe ser usado en Server Components y API Routes
 * NUNCA importar este módulo en Client Components ('use client')
 *
 * Razones:
 * 1. Seguridad: Expondría credenciales de base de datos al navegador
 * 2. Performance: Las queries desde el navegador son ineficientes
 * 3. Arquitectura: Next.js está diseñado para queries server-side
 *
 * Uso correcto:
 * - ✅ Server Components: import { prisma } from '@/lib/prisma'
 * - ✅ API Routes: import { prisma } from '@/lib/prisma'
 * - ❌ Client Components: NO usar Prisma directamente, usar fetch() a API Routes
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined
}

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log:
			process.env.NODE_ENV === 'development'
				? ['query', 'error', 'warn']
				: ['error'],
	})

// Store Prisma Client in global to prevent multiple instances
// This is critical for preventing connection pool exhaustion
// In production, Next.js may create multiple instances, so we ensure singleton
// REFRESH: 2026-04-29T19:32:00
if (process.env.NODE_ENV === 'production') {
	globalForPrisma.prisma = prisma
} else {
	globalForPrisma.prisma = prisma
}

// Advertencia en desarrollo si se importa desde un Client Component
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
	console.error(
		'❌ ERROR: Prisma Client no puede ser usado en Client Components.\n' +
		'   Usa fetch() a una API Route en su lugar.\n' +
		'   Ver docs/PRISMA_USAGE.md para más información.'
	)
}
