import { PrismaClient } from '@prisma/client'

export const currencies = [
	{ name: 'Peso Colombiano', symbol: 'COP' },
	{ name: 'Moneda Extranjera', symbol: 'USD' },
]

export async function seedCurrencies(prisma: PrismaClient) {
	console.log('\n👉 Procesando Monedas (Currencies)...')

	for (const currency of currencies) {
		// Buscamos por symbol ya que es único conceptualmente (aunque no en schema unique)
		// Si no, buscamos por name
		const existing = await prisma.currency.findFirst({
			where: { symbol: currency.symbol },
		})

		if (existing) {
			await prisma.currency.update({
				where: { idCurrency: existing.idCurrency },
				data: {
					name: currency.name,
					active: true,
				},
			})
			console.log(
				`✅ Moneda actualizada: ${currency.name} (${currency.symbol})`
			)
		} else {
			await prisma.currency.create({
				data: {
					name: currency.name,
					symbol: currency.symbol,
					active: true,
				},
			})
			console.log(`✅ Moneda creada: ${currency.name} (${currency.symbol})`)
		}
	}
}
