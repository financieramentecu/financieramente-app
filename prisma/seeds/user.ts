import { PrismaClient, Prisma } from '@prisma/client'

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
}
