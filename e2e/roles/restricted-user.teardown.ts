import { test as teardown } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

/** Soft-deletes the restricted user and role (project rule: never delete rows). */
teardown('deactivate the restricted user and role', async () => {
	const prisma = new PrismaClient()
	try {
		await prisma.user.updateMany({
			where: { email: 'e2e.restringido@financieramentecu.com' },
			data: { active: false },
		})
		await prisma.role.updateMany({
			where: { code: 'E2E_RESTRICTED', isSystem: false },
			data: { active: false },
		})
	} finally {
		await prisma.$disconnect()
	}
})
