import { PrismaClient } from '@prisma/client'

export const companies = [
	{ name: 'SKANDIA', type: 'NACIONAL', idCurrency: 1 },
	{ name: 'MEJORCDT', type: 'NACIONAL', idCurrency: 2 },
	{ name: 'TRINITY', type: 'INTERNACIONAL', idCurrency: 2 },
	{ name: 'ITA', type: 'INTERNACIONAL', idCurrency: 2 },
	{ name: 'MANHATTAN', type: 'INTERNACIONAL', idCurrency: 2 },
	{ name: 'AFIBL', type: 'INTERNACIONAL', idCurrency: 2 },
	{ name: 'DOMINION', type: 'INTERNACIONAL', idCurrency: 2 },
	{ name: 'STONEX', type: 'INTERNACIONAL', idCurrency: 2 },
]

export async function seedCompanies(prisma: PrismaClient) {
	console.log('\n👉 Procesando Compañías (Companies)...')

	for (const company of companies) {
		const existing = await prisma.company.findFirst({
			where: { name: company.name },
		})

		if (existing) {
			await prisma.company.update({
				where: { idCompany: existing.idCompany },
				data: {
					idTypeCompany: company.type,
					idCurrency: company.idCurrency,
					status: true,
				},
			})
			console.log(`✅ Compañía actualizada: ${company.name}`)
		} else {
			await prisma.company.create({
				data: {
					name: company.name,
					idTypeCompany: company.type,
					idCurrency: company.idCurrency,
					status: true,
				},
			})
			console.log(`✅ Compañía creada: ${company.name}`)
		}
	}
}
