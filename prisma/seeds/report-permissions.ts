import { PrismaClient } from '@prisma/client'

const PERFORMANCE_LEADER_NAME = 'Performance Leader'
const BUSINESS_LEADER_NAME = 'Business Leader'

const REPORT_SEEDS = [
	{
		code: 'PRODUCCION_REAL',
		name: 'Producción Real',
		description: 'Reporte de Producción Real con filtros, jerarquía y KPIs',
		routePath: '/dashboard/reportes/produccion-real',
		categoryNames: [PERFORMANCE_LEADER_NAME],
	},
	{
		code: 'LEADS_ANALYTICS',
		name: 'Analítica de Leads',
		description:
			'Reporte dinámico de leads por estado de seguimiento, conversión a negocio y carga por asesor',
		routePath: '/dashboard/reportes/leads-analytics',
		categoryNames: [PERFORMANCE_LEADER_NAME, BUSINESS_LEADER_NAME],
	},
	{
		code: 'ABA_MFUND',
		name: 'ABA-MFUND',
		description:
			'Reporte ABA-MFUND (SKANDIA + MFUND) con KPIs, ranking y detalle',
		routePath: '/dashboard/reportes/aba-mfund',
		categoryNames: [PERFORMANCE_LEADER_NAME, BUSINESS_LEADER_NAME],
	},
] as const

/**
 * Seed report catalog + default category enablement.
 * Enables Producción Real for Performance Leader after categories exist.
 * Enables Analítica de Leads and ABA-MFUND for Performance Leader and Business
 * Leader independently (missing categories are logged and skipped without
 * aborting the rest).
 */
export async function seedReportPermissions(prisma: PrismaClient) {
	console.log('\n👉 Procesando Report Definitions y permisos...')

	for (const seed of REPORT_SEEDS) {
		const report = await prisma.reportDefinition.upsert({
			where: { code: seed.code },
			create: {
				code: seed.code,
				name: seed.name,
				description: seed.description,
				routePath: seed.routePath,
				status: true,
			},
			update: {
				name: seed.name,
				description: seed.description,
				routePath: seed.routePath,
				status: true,
			},
		})
		console.log(`✅ Reporte upserted: ${report.code}`)

		for (const categoryName of seed.categoryNames) {
			const category = await prisma.category.findFirst({
				where: { name: categoryName, status: true },
			})

			if (!category) {
				console.error(
					`❌ Categoría '${categoryName}' no encontrada; omitiendo permiso ${seed.code}.`
				)
				continue
			}

			await prisma.categoryReportPermission.upsert({
				where: {
					idReport_idCategory: {
						idReport: report.id,
						idCategory: category.id,
					},
				},
				create: {
					idReport: report.id,
					idCategory: category.id,
					status: true,
				},
				update: {
					status: true,
				},
			})
			console.log(`✅ Permiso habilitado: ${categoryName} → ${seed.code}`)
		}
	}
}
