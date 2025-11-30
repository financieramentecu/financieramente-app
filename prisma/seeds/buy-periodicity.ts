import { PrismaClient } from '@prisma/client'

export const periodicities = [
	'Anual',
	'Semestral',
	'Cuatrimestral',
	'Trimestral',
	'Bimensual',
	'Mensual',
	'Aportes Ocasionales',
	'Pago Único',
]

export async function seedBuyPeriodicities(prisma: PrismaClient) {
	console.log('\n👉 Procesando Periodicidades (BuyPeriodicities)...')

	for (const name of periodicities) {
		const existing = await prisma.buyPeriodicity.findFirst({
			where: { name },
		})

		if (existing) {
			await prisma.buyPeriodicity.update({
				where: { idBuyPeriodicity: existing.idBuyPeriodicity },
				data: { active: true },
			})
			console.log(`✅ Periodicidad actualizada: ${name}`)
		} else {
			await prisma.buyPeriodicity.create({
				data: { name, active: true },
			})
			console.log(`✅ Periodicidad creada: ${name}`)
		}
	}
}
