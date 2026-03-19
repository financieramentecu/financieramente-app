import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10
async function hashPassword(password: string): Promise<string> {
	if (!password || password.trim().length === 0) {
		throw new Error('Password cannot be empty')
	}
	const hash = await bcrypt.hash(password, SALT_ROUNDS)
	return hash
}

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
	ssoOnly: false, // Permitir login normal
	password: 'admin', // Contraseña temporal
}

export const andresUser = {
	name: 'Andres',
	lastName: 'Agudelo',
	typeIdentity: 'CC',
	identityNumber: null,
	email: 'andres.agudelo@financieramentecu.com',
	roleCode: 'ADMIN',
	idUserLeader: null,
	entryDate: new Date('2026-03-07'),
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

export const agentUser = {
	name: 'Agente',
	lastName: 'Prueba',
	typeIdentity: 'CC',
	identityNumber: '1234567890',
	email: 'agente.prueba@financieramentecu.com',
	roleCode: 'AGENTE',
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

	// Hashear password si viene definido (extendemos el tipo adminUser temporalmente)
	let adminPasswordCrypted = null
	if (adminUser.password) {
		adminPasswordCrypted = await hashPassword(adminUser.password)
	}

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
		password: adminPasswordCrypted,
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
			password: adminPasswordCrypted, // Actualizar password si ha cambiado
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

	// 2.5 Procesar usuario Andres Agudelo (SSO only)
	const existingAndres = await prisma.user.findFirst({
		where: { email: andresUser.email },
	})

	const andresData = {
		name: andresUser.name,
		lastName: andresUser.lastName,
		typeIdentity: andresUser.typeIdentity,
		identityNumber: andresUser.identityNumber,
		email: andresUser.email,
		idRole: adminRole.idRole,
		idUserLeader: andresUser.idUserLeader,
		entryDate: andresUser.entryDate,
		active: andresUser.active,
		ssoOnly: andresUser.ssoOnly,
	} as Prisma.UserUncheckedCreateInput

	if (existingAndres) {
		await prisma.user.update({
			where: { idUser: existingAndres.idUser },
			data: andresData,
		})
		console.log(
			`✅ Usuario actualizado: ${andresUser.name} ${andresUser.lastName} (${andresUser.email})`
		)
	} else {
		await prisma.user.create({ data: andresData })
		console.log(
			`✅ Usuario creado: ${andresUser.name} ${andresUser.lastName} (${andresUser.email})`
		)
	}

	// 3. Procesar Super Admin User
	console.log('\n👉 Procesando Super Admin User...')

	// Validar que la variable de entorno esté definida
	if (!process.env.SUPER_ADMIN_PASSWORD) {
		console.warn(
			'⚠️  SUPER_ADMIN_PASSWORD no está definida. Saltando creación de Super Admin.'
		)
	} else {

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

	// 4. Procesar Agente Prueba
	console.log('\n👉 Procesando Usuario Agente...')
	const agentRole = await prisma.role.findFirst({
		where: { code: agentUser.roleCode },
	})

	if (!agentRole) {
		console.error(`❌ Error: No se encontró el rol ${agentUser.roleCode}.`)
		return
	}

	const existingAgent = await prisma.user.findFirst({
		where: { email: agentUser.email },
	})

	const agentPasswordCrypted = await hashPassword('password123')

	const agentData = {
		name: agentUser.name,
		lastName: agentUser.lastName,
		typeIdentity: agentUser.typeIdentity,
		identityNumber: agentUser.identityNumber,
		email: agentUser.email,
		password: agentPasswordCrypted,
		ssoOnly: agentUser.ssoOnly,
		idRole: agentRole.idRole,
		idUserLeader: agentUser.idUserLeader,
		entryDate: agentUser.entryDate,
		active: agentUser.active,
	} as Prisma.UserUncheckedCreateInput

	if (existingAgent) {
		await prisma.user.update({
			where: { idUser: existingAgent.idUser },
			data: agentData,
		})
		console.log(
			`✅ Usuario Agente actualizado: ${agentUser.name} (${agentUser.email})`
		)
	} else {
		await prisma.user.create({ data: agentData })
		console.log(
			`✅ Usuario Agente creado: ${agentUser.name} (${agentUser.email})`
		)
	}
}
