import { PrismaClient } from '@prisma/client'

export const companies = [
	{ name: 'SKANDIA', type: 'NACIONAL' },
	{ name: 'MEJORCDT', type: 'NACIONAL' },
	{ name: 'TRINITY', type: 'INTERNACIONAL' },
	{ name: 'ITA', type: 'INTERNACIONAL' },
	{ name: 'MANHATTAN', type: 'INTERNACIONAL' },
	{ name: 'AFIBL', type: 'INTERNACIONAL' },
	{ name: 'DOMINION', type: 'INTERNACIONAL' },
	{ name: 'STONEX', type: 'INTERNACIONAL' },
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
					status: true,
				},
			})
			console.log(`✅ Compañía actualizada: ${company.name}`)
		} else {
			await prisma.company.create({
				data: {
					name: company.name,
					idTypeCompany: company.type,
					status: true,
				},
			})
			console.log(`✅ Compañía creada: ${company.name}`)
		}
	}
}
