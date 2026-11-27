import { test as setup } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import { ImpersonationSelect } from '../pages/impersonation-select.page'
import {
	ADMIN_STORAGE_STATE_FILE,
	RESTRICTED_STORAGE_STATE,
	RESTRICTED_USER_FILE,
	type RestrictedUser,
} from './restricted-user.fixture'

/**
 * Creates (or revives) a role with ONLY negocios.ver (own) + calculadora.usar and
 * a Google-only user holding it. Custom roles cannot sign in with a password (that
 * path is limited to ADMIN/AGENTE/PARTNER), so the admin impersonates the user
 * ("Ver como") and that real session is stored. The teardown soft-deletes both.
 * Requires the dev server to run with ACCESS_CONTROL_SOURCE=db.
 */
const ROLE_CODE = 'E2E_RESTRICTED'
const ROLE_NAME = 'E2E Restringido'
const EMAIL = 'e2e.restringido@financieramentecu.com'
const IDENTITY = '777000001'

setup('create the restricted role and user, then impersonate it', async ({ browser }) => {
	const prisma = new PrismaClient()
	try {
		const role = await prisma.role.upsert({
			where: { code: ROLE_CODE },
			create: { code: ROLE_CODE, name: ROLE_NAME, isSystem: false, active: true },
			update: { name: ROLE_NAME, active: true },
		})
		const catalog = await prisma.permission.findMany({
			where: { code: { in: ['negocios.ver', 'calculadora.usar'] } },
			select: { idPermission: true, code: true },
		})
		await prisma.rolePermission.updateMany({
			where: { idRole: role.idRole },
			data: { status: false },
		})
		for (const permission of catalog) {
			const data = {
				scope: permission.code === 'negocios.ver' ? ('OWN' as const) : null,
				idMinLevel: null,
				status: true,
			}
			await prisma.rolePermission.upsert({
				where: {
					idRole_idPermission: { idRole: role.idRole, idPermission: permission.idPermission },
				},
				create: { idRole: role.idRole, idPermission: permission.idPermission, ...data },
				update: data,
			})
		}

		const userData = { ssoOnly: true, idRole: role.idRole, active: true, activatedAt: new Date() }
		await prisma.user.upsert({
			where: { email: EMAIL },
			create: {
				...userData,
				email: EMAIL,
				name: 'E2E',
				lastName: 'Restringido',
				typeIdentity: 'CC',
				identityNumber: IDENTITY,
				entryDate: new Date(),
			},
			update: userData,
		})

		fs.mkdirSync('e2e/.auth', { recursive: true })
		const restricted: RestrictedUser = { email: EMAIL, roleId: role.idRole, roleName: ROLE_NAME }
		fs.writeFileSync(RESTRICTED_USER_FILE, JSON.stringify(restricted))
	} finally {
		await prisma.$disconnect()
	}

	const context = await browser.newContext({ storageState: ADMIN_STORAGE_STATE_FILE })
	const page = await context.newPage()
	await page.goto('/dashboard')
	await new ImpersonationSelect(page).impersonate('E2E')
	await context.storageState({ path: RESTRICTED_STORAGE_STATE })
	await context.close()
})
