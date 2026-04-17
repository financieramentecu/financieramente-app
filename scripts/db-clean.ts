import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	console.log('🧹 Iniciando limpieza de base de datos para pruebas...')

	try {
		// 1. Limpiar auditoría (opcional)
		const auditCount = await prisma.auditLog.deleteMany({})
		console.log(`✅ AuditLog: ${auditCount.count} registros eliminados`)

		// 2. Limpiar liquidaciones y distribuciones (orden específico por FKs)
		const clawbackCount = await prisma.clawback.deleteMany({})
		console.log(`✅ Clawback: ${clawbackCount.count} registros eliminados`)

		const clawbackBalanceCount = await prisma.clawbackBalance.deleteMany({})
		console.log(`✅ ClawbackBalance: ${clawbackBalanceCount.count} registros eliminados`)

		const distributionCount = await prisma.comissionDistribution.deleteMany({})
		console.log(`✅ ComissionDistribution: ${distributionCount.count} registros eliminados`)

		const settlementCount = await prisma.settlementCommission.deleteMany({})
		console.log(`✅ SettlementCommission: ${settlementCount.count} registros eliminados`)

		const importErrorCount = await prisma.fileImportError.deleteMany({})
		console.log(`✅ FileImportError: ${importErrorCount.count} registros eliminados`)

		// 3. Limpiar negocios y archivos
		const businessCount = await prisma.business.deleteMany({})
		console.log(`✅ Business: ${businessCount.count} registros eliminados`)

		const importCount = await prisma.fileImport.deleteMany({})
		console.log(`✅ FileImport: ${importCount.count} registros eliminados`)

		// 4. Limpiar clientes (ya que se crean durante la carga de negocios)
		const clientCount = await prisma.client.deleteMany({})
		console.log(`✅ Client: ${clientCount.count} registros eliminados`)

		console.log('\n✨ Base de datos limpia y lista para nuevas pruebas desde la carga.')
	} catch (error) {
		console.error('❌ Error durante la limpieza:', error)
		throw error
	}
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
