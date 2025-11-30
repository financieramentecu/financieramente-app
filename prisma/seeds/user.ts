import { PrismaClient, Prisma } from '@prisma/client'
import { hashPassword } from '../../src/lib/auth/password-utils'

export const adminUser = {
	name: 'Vanesa',
	lastName: 'Cardona',
	typeIdentity: 'CC',
	identityNumber: '1053770996',
	email: 'vanesa.cardona@financieramentecu.com',
	roleCode: 'ADMIN',
	idUserLeader: null,
	entryDate: new Date(),
	active: true,
	ssoOnly: true,
}

export const superAdminUser = {
	name: 'Super Admin',
	lastName: null,
	typeIdentity: 'CC',
	identityNumber: null,
	email: 'admin@financieramentecu.com',
	roleCode: 'ADMIN',
	idUserLeader: null,
	entryDate: new Date(),
	active: true,
	ssoOnly: false,
}

export async function seedUsers(prisma: PrismaClient) {
	console.log('\n👉 Procesando Usuarios (Users)...')

	// 1. Obtener ID del rol ADMIN
	const adminRole = await prisma.role.findFirst({
		where: { code: adminUser.roleCode },
	})

	if (!adminRole) {
		console.error(
			`❌ Error: No se encontró el rol ${adminUser.roleCode}. Ejecuta el seed de roles primero.`
		)
		return
	}

	// 2. Verificar si el usuario ya existe
	const existing = await prisma.user.findFirst({
		where: {
			typeIdentity: adminUser.typeIdentity,
			identityNumber: adminUser.identityNumber,
		},
	})

	const userData = {
		name: adminUser.name,
		lastName: adminUser.lastName,
		typeIdentity: adminUser.typeIdentity,
		identityNumber: adminUser.identityNumber,
		email: adminUser.email,
		idRole: adminRole.idRole,
		idUserLeader: adminUser.idUserLeader,
		entryDate: adminUser.entryDate,
		active: adminUser.active,
		ssoOnly: adminUser.ssoOnly,
		password: null,
	} as Prisma.UserUncheckedCreateInput

	if (existing) {
		const updateData = {
			name: adminUser.name,
			lastName: adminUser.lastName,
			email: adminUser.email,
			idRole: adminRole.idRole,
			idUserLeader: adminUser.idUserLeader,
			entryDate: adminUser.entryDate,
			active: adminUser.active,
			ssoOnly: adminUser.ssoOnly,
			password: null,
		} as Prisma.UserUncheckedUpdateInput
		await prisma.user.update({
			where: { idUser: existing.idUser },
			data: updateData,
		})
		console.log(
			`✅ Usuario actualizado: ${adminUser.name} ${adminUser.lastName} (${adminUser.identityNumber})`
		)
	} else {
		await prisma.user.create({
			data: userData,
		})
		console.log(
			`✅ Usuario creado: ${adminUser.name} ${adminUser.lastName} (${adminUser.identityNumber})`
		)
	}

	// 3. Procesar Super Admin User
	console.log('\n👉 Procesando Super Admin User...')

	// Validar que la variable de entorno esté definida
	if (!process.env.SUPER_ADMIN_PASSWORD) {
		console.warn(
			'⚠️  SUPER_ADMIN_PASSWORD no está definida. Saltando creación de Super Admin.'
		)
		return
	}

	// Verificar si el super admin ya existe
	const existingSuperAdmin = await prisma.user.findFirst({
		where: {
			email: superAdminUser.email,
		},
	})

	// Hashear la contraseña del super admin desde la variable de entorno
	const hashedPassword = await hashPassword(process.env.SUPER_ADMIN_PASSWORD)

	const superAdminData = {
		name: superAdminUser.name,
		lastName: superAdminUser.lastName,
		typeIdentity: superAdminUser.typeIdentity,
		identityNumber: superAdminUser.identityNumber,
		email: superAdminUser.email,
		password: hashedPassword,
		ssoOnly: superAdminUser.ssoOnly,
		idRole: adminRole.idRole,
		idUserLeader: superAdminUser.idUserLeader,
		entryDate: superAdminUser.entryDate,
		active: superAdminUser.active,
	} as Prisma.UserUncheckedCreateInput

	if (existingSuperAdmin) {
		const updateSuperAdminData = {
			name: superAdminUser.name,
			lastName: superAdminUser.lastName,
			email: superAdminUser.email,
			password: hashedPassword,
			ssoOnly: superAdminUser.ssoOnly,
			idRole: adminRole.idRole,
			idUserLeader: superAdminUser.idUserLeader,
			entryDate: superAdminUser.entryDate,
			active: superAdminUser.active,
		} as Prisma.UserUncheckedUpdateInput
		await prisma.user.update({
			where: { idUser: existingSuperAdmin.idUser },
			data: updateSuperAdminData,
		})
		console.log(
			`✅ Super Admin actualizado: ${superAdminUser.name} (${superAdminUser.email})`
		)
	} else {
		await prisma.user.create({
			data: superAdminData,
		})
		console.log(
			`✅ Super Admin creado: ${superAdminUser.name} (${superAdminUser.email})`
		)
	}
}
