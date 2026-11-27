/**
 * Sync the permission catalog and seed the initial role grants.
 * Safe to run in QA/prod: idempotent; roles that already have permissions
 * (edited from the roles editor) are not overwritten.
 *
 *   npm run prisma:seed:permissions
 */
import { PrismaClient } from '@prisma/client'
import { seedPermissions } from './seeds/permissions'

const prisma = new PrismaClient()

async function main() {
	console.log('🌱 Seed permisos…\n')
	await seedPermissions(prisma)
	console.log('\n✨ Seed de permisos completado.')
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
