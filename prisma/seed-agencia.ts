/**
 * Seed mínimo: usuario sistema Agencia + vínculo categoría AGENCIA (FIXED_BENEFICIARY).
 *
 * Prerrequisitos en BD: rol `ADMIN`, categoría con `code: 'AGENCIA'` (p. ej. tras `seedCategories`).
 *
 * Uso:
 *   npx tsx prisma/seed-agencia.ts
 *   npm run prisma:seed:agencia
 *
 * Opcional: AGENCIA_USER_PASSWORD en .env para establecer password del usuario Agencia.
 */
import { PrismaClient } from '@prisma/client'
import { seedAgenciaSystemUser } from './seeds/user'
import { seedCategoryBeneficiaryLinks } from './seeds/category'

const prisma = new PrismaClient()

async function main() {
	console.log('🌱 Seed solo Agencia (usuario + categoría AGENCIA)…\n')

	const adminRole = await prisma.role.findFirst({
		where: { code: 'ADMIN' },
	})
	if (!adminRole) {
		console.error(
			'❌ No existe rol ADMIN. Ejecuta antes: npx tsx prisma/seeds/roles.ts o el seed completo.'
		)
		process.exit(1)
	}

	await seedAgenciaSystemUser(prisma, adminRole)
	await seedCategoryBeneficiaryLinks(prisma)

	console.log('\n✨ Seed Agencia completado.')
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
