/**
 * Seed report catalog + default category enablement.
 * Enables Producción Real for Performance Leader after categories exist.
 *
 * Usage (standalone):
 *   npx tsx prisma/seeds/report-permissions.ts
 *
 * Also invoked from prisma/seed.ts after categories exist.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const PRODUCCION_REAL_CODE = 'PRODUCCION_REAL'
const PRODUCCION_REAL_ROUTE = '/dashboard/reportes/produccion-real'
const PERFORMANCE_LEADER_NAME = 'Performance Leader'

export async function seedReportPermissions(prisma: PrismaClient) {
	console.log('\n👉 Procesando Report Definitions y permisos...')

	const report = await prisma.reportDefinition.upsert({
		where: { code: PRODUCCION_REAL_CODE },
		create: {
			code: PRODUCCION_REAL_CODE,
			name: 'Producción Real',
			description: 'Reporte de Producción Real con filtros, jerarquía y KPIs',
			routePath: PRODUCCION_REAL_ROUTE,
			status: true,
		},
		update: {
			name: 'Producción Real',
			description: 'Reporte de Producción Real con filtros, jerarquía y KPIs',
			routePath: PRODUCCION_REAL_ROUTE,
			status: true,
		},
	})
	console.log(`✅ Reporte upserted: ${report.code}`)

	const performanceLeader = await prisma.category.findFirst({
		where: { name: PERFORMANCE_LEADER_NAME, status: true },
	})

	if (!performanceLeader) {
		console.error(
			`❌ Categoría '${PERFORMANCE_LEADER_NAME}' no encontrada; omitiendo permiso por defecto.`
		)
		return
	}

	await prisma.categoryReportPermission.upsert({
		where: {
			idReport_idCategory: {
				idReport: report.id,
				idCategory: performanceLeader.id,
			},
		},
		create: {
			idReport: report.id,
			idCategory: performanceLeader.id,
			status: true,
		},
		update: {
			status: true,
		},
	})
	console.log(
		`✅ Permiso habilitado: ${PERFORMANCE_LEADER_NAME} → ${PRODUCCION_REAL_CODE}`
	)
}

const isMainModule =
	process.argv[1] != null &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMainModule) {
	const prisma = new PrismaClient()

	seedReportPermissions(prisma)
		.catch((error) => {
			console.error('❌ Error en seed de permisos de reporte:', error)
			process.exit(1)
		})
		.finally(async () => {
			await prisma.$disconnect()
		})
}


