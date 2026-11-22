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
import { readPoolOptionsFromEnv, withPoolParams } from './prisma-pool'
import { isBenignPrismaConnectionError, isNeonDatabaseUrl } from './prisma-log'

const NEON_KEEPALIVE_MS = 4 * 60 * 1000

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined
	neonKeepAliveStarted?: boolean
}

function createPrismaClient(): PrismaClient {
	const logQueries =
		process.env.NODE_ENV === 'development' && process.env.PRISMA_LOG_QUERIES === '1'

	const client = new PrismaClient({
		// Pool size and timeouts come from PRISMA_* env vars; DATABASE_URL params win.
		datasourceUrl: withPoolParams(
			process.env.DATABASE_URL,
			readPoolOptionsFromEnv(process.env)
		),
		// Errors are events so a Neon suspend does not print one line per pooled connection.
		// Full SQL logging serializes every round trip. Opt in with PRISMA_LOG_QUERIES=1.
		log: logQueries
			? [
					{ emit: 'event', level: 'error' },
					{ emit: 'stdout', level: 'query' },
					{ emit: 'stdout', level: 'warn' },
				]
			: [{ emit: 'event', level: 'error' }],
	})

	client.$on('error', (event) => {
		if (isBenignPrismaConnectionError(event.message)) return
		console.error(event.message)
	})

	return client
}

function startNeonKeepAlive(client: PrismaClient): void {
	if (process.env.NODE_ENV !== 'development') return
	if (!isNeonDatabaseUrl(process.env.DATABASE_URL)) return
	if (globalForPrisma.neonKeepAliveStarted) return

	const timer = setInterval(() => {
		void client.$queryRaw`SELECT 1`.catch(() => undefined)
	}, NEON_KEEPALIVE_MS)
	timer.unref?.()
	globalForPrisma.neonKeepAliveStarted = true
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (!globalForPrisma.prisma) {
	startNeonKeepAlive(prisma)
}

// Store Prisma Client in global to prevent multiple instances
// This is critical for preventing connection pool exhaustion
globalForPrisma.prisma = prisma

// Advertencia en desarrollo si se importa desde un Client Component
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
	console.error(
		'❌ ERROR: Prisma Client no puede ser usado en Client Components.\n' +
		'   Usa fetch() a una API Route en su lugar.\n' +
		'   Ver docs/PRISMA_USAGE.md para más información.'
	)
}
