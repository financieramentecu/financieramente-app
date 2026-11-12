import { PrismaClient } from '@prisma/client'
import {
	seedDefaultRoleGrants,
	syncAdminPermissions,
	syncPermissionCatalog,
} from '../../src/features/access-control/services/permission-catalog-sync.service'

/**
 * Syncs the permission catalog and seeds the initial role grants.
 * Idempotent: roles that already have permissions are not overwritten.
 * Must run after seedRoles and seedLevels.
 */
export async function seedPermissions(prisma: PrismaClient) {
	console.log('\n👉 Procesando Permisos...')
	await syncPermissionCatalog(prisma)
	await syncAdminPermissions(prisma)
	await seedDefaultRoleGrants(prisma)
	const total = await prisma.permission.count({ where: { status: true } })
	console.log(`✅ Permisos sincronizados: ${total}`)
}
