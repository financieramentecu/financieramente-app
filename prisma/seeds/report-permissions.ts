import { PrismaClient } from '@prisma/client'

const PRODUCCION_REAL_CODE = 'PRODUCCION_REAL'
const PRODUCCION_REAL_ROUTE = '/dashboard/reportes/produccion-real'
const ABA_MFUND_CODE = 'ABA_MFUND'
const ABA_MFUND_ROUTE = '/dashboard/reportes/aba-mfund'
const PERFORMANCE_LEADER_NAME = 'Performance Leader'
const BUSINESS_LEADER_NAME = 'Business Leader'

async function enableReportForCategory(
	prisma: PrismaClient,
	idReport: number,
	categoryName: string,
	reportCode: string
): Promise<void> {
	const category = await prisma.category.findFirst({
		where: { name: categoryName, status: true },
	})

	if (!category) {
		console.error(
			`❌ Categoría '${categoryName}' no encontrada; omitiendo permiso ${reportCode}.`
		)
		return
	}

	await prisma.categoryReportPermission.upsert({
		where: {
			idReport_idCategory: {
				idReport,
				idCategory: category.id,
			},
		},
		create: {
			idReport,
			idCategory: category.id,
			status: true,
		},
		update: {
			status: true,
		},
	})
	console.log(`✅ Permiso habilitado: ${categoryName} → ${reportCode}`)
}

/**
 * Seed report catalog + default category enablement.
 * Enables Producción Real for Performance Leader after categories exist.
 * Enables ABA-MFUND for Performance Leader and Business Leader independently
 * (missing categories are logged and skipped without aborting the rest).
 */
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

	await enableReportForCategory(
		prisma,
		report.id,
		PERFORMANCE_LEADER_NAME,
		PRODUCCION_REAL_CODE
	)

	const abaMfund = await prisma.reportDefinition.upsert({
		where: { code: ABA_MFUND_CODE },
		create: {
			code: ABA_MFUND_CODE,
			name: 'ABA-MFUND',
			description: 'Reporte ABA-MFUND (SKANDIA + MFUND) con KPIs, ranking y detalle',
			routePath: ABA_MFUND_ROUTE,
			status: true,
		},
		update: {
			name: 'ABA-MFUND',
			description: 'Reporte ABA-MFUND (SKANDIA + MFUND) con KPIs, ranking y detalle',
			routePath: ABA_MFUND_ROUTE,
			status: true,
		},
	})
	console.log(`✅ Reporte upserted: ${abaMfund.code}`)

	await enableReportForCategory(
		prisma,
		abaMfund.id,
		PERFORMANCE_LEADER_NAME,
		ABA_MFUND_CODE
	)
	await enableReportForCategory(
		prisma,
		abaMfund.id,
		BUSINESS_LEADER_NAME,
		ABA_MFUND_CODE
	)
}
