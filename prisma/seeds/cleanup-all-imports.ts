import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupAllImports() {
	console.log('🧹 Iniciando limpieza total de datos de importación...')

	try {
		// 1. Clawbacks
		const { count: deletedClawbacks } = await prisma.clawback.deleteMany({})
		console.log(`  ✓ ${deletedClawbacks} clawbacks eliminados.`)

		// 2. ComissionDistributions
		const { count: deletedDistributions } = await prisma.comissionDistribution.deleteMany({})
		console.log(`  ✓ ${deletedDistributions} distribuciones de comisión eliminadas.`)

		// 3. SettlementCommissions
		const { count: deletedSettlements } = await prisma.settlementCommission.deleteMany({})
		console.log(`  ✓ ${deletedSettlements} comisiones de asentamiento eliminadas.`)

		// 4. FileImportErrors
		const { count: deletedErrors } = await prisma.fileImportError.deleteMany({})
		console.log(`  ✓ ${deletedErrors} errores de importación eliminados.`)

		// 5. DistributionApprovals
		const { count: deletedApprovals } = await prisma.distributionApproval.deleteMany({})
		console.log(`  ✓ ${deletedApprovals} aprobaciones de distribución eliminadas.`)

		// 6. FileImports
		const { count: deletedImports } = await prisma.fileImport.deleteMany({})
		console.log(`  ✓ ${deletedImports} archivos de importación eliminados.`)

		// 7. Negocios creados por seeds o pruebas (opcionalmente podrías filtrar por prefijos si quieres mantener algunos)
		// Para una limpieza total "desde cero" de pruebas:
		const { count: deletedBusinesses } = await prisma.business.deleteMany({
			where: {
				OR: [
					{ contract: { startsWith: 'CTO-' } },
					{ contract: { startsWith: 'VOL-' } },
					{ contract: { startsWith: 'POL-' } },
					{ contract: { startsWith: 'TEST-' } }
				]
			}
		})
		console.log(`  ✓ ${deletedBusinesses} negocios (con prefijos de prueba) eliminados.`)

		console.log('✨ Limpieza total completada con éxito.')
	} catch (error) {
		console.error('❌ Error durante la limpieza:', error)
		throw error
	}
}

cleanupAllImports()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
