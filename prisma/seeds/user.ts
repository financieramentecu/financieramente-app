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
	entryDate: new Date(),
	active: true,
	ssoOnly: false,
}

export const liderUser = {
	name: 'Lider',
	lastName: 'Prueba',
	typeIdentity: 'CC',
	identityNumber: '9876543210',
	email: 'lider.prueba@financieramentecu.com',
	roleCode: 'AGENTE',
	entryDate: new Date(),
	active: true,
	ssoOnly: false,
}


/** System user for FIXED_BENEFICIARY category AGENCIA (pool / company). */
export const agenciaSystemUser = {
	name: 'Agencia',
	lastName: 'Sistema',
	typeIdentity: 'CC',
	identityNumber: null,
	email: 'agencia@financieramentecu.com',
	roleCode: 'ADMIN',
	idUserLeader: null,
	entryDate: new Date(),
	active: true,
	ssoOnly: true,
}

/**
 * Upsert solo el usuario sistema Agencia (`agencia@financieramentecu.com`).
 * Requiere rol ADMIN en BD. Opcional: `AGENCIA_USER_PASSWORD` en .env para password.
 */
export async function seedAgenciaSystemUser(
	prisma: PrismaClient,
	adminRole: { idRole: number }
): Promise<void> {
	console.log('\n👉 Procesando usuario sistema Agencia…')
	const existingAgencia = await prisma.user.findFirst({
		where: { email: agenciaSystemUser.email },
	})
	let agenciaPasswordCrypted: string | null = null
	if (process.env.AGENCIA_USER_PASSWORD?.trim()) {
		agenciaPasswordCrypted = await hashPassword(
			process.env.AGENCIA_USER_PASSWORD.trim()
		)
	}
	const agenciaData = {
		name: agenciaSystemUser.name,
		lastName: agenciaSystemUser.lastName,
		typeIdentity: agenciaSystemUser.typeIdentity,
		identityNumber: agenciaSystemUser.identityNumber,
		email: agenciaSystemUser.email,
		idRole: adminRole.idRole,
		idUserLeader: agenciaSystemUser.idUserLeader,
		entryDate: agenciaSystemUser.entryDate,
		active: agenciaSystemUser.active,
		ssoOnly: agenciaSystemUser.ssoOnly,
		password: agenciaPasswordCrypted,
	} as Prisma.UserUncheckedCreateInput

	if (existingAgencia) {
		await prisma.user.update({
			where: { idUser: existingAgencia.idUser },
			data: {
				name: agenciaData.name,
				lastName: agenciaData.lastName,
				active: agenciaData.active,
				ssoOnly: agenciaData.ssoOnly,
				...(agenciaPasswordCrypted ? { password: agenciaPasswordCrypted } : {}),
			},
		})
		console.log(`✅ Usuario Agencia actualizado: ${agenciaSystemUser.email}`)
	} else {
		await prisma.user.create({ data: agenciaData })
		console.log(`✅ Usuario Agencia creado: ${agenciaSystemUser.email}`)
	}
}

export async function seedUsers(prisma: PrismaClient) {
	console.log('\n👉 Procesando Usuarios (Users)...')
	
	const adminRole = await prisma.role.findFirst({
		where: { code: 'ADMIN' },
	})
	if (!adminRole) {
		throw new Error('Rol ADMIN no encontrado')
	}

	const agentRole = await prisma.role.findFirst({
		where: { code: 'AGENTE' },
	})

	const juniorCategory = await prisma.level.findUnique({ where: { code: 'JUNIOR' } })
	const liderCategory = await prisma.level.findUnique({ where: { code: 'LIDER' } })

	if (!juniorCategory) {
		console.warn('⚠️  Categoría JUNIOR no encontrada. Los cálculos de comisión podrían fallar.')
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
		idLevel: juniorCategory?.idLevel || null, // Asignar nivel por defecto
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
			idLevel: juniorCategory?.idLevel || null,
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
			data: { ...andresData, idLevel: juniorCategory?.idLevel || null },
		})
		console.log(
			`✅ Usuario actualizado: ${andresUser.name} ${andresUser.lastName} (${andresUser.email})`
		)
	} else {
		await prisma.user.create({ data: { ...andresData, idLevel: juniorCategory?.idLevel || null } })
		console.log(
			`✅ Usuario creado: ${andresUser.name} ${andresUser.lastName} (${andresUser.email})`
		)
	}

	// 2.5.1.1 Procesar Líder Prueba
	console.log('👉 Procesando Líder Prueba…')
	const existingLider = await prisma.user.findUnique({ where: { email: liderUser.email } })

	const liderData = {
		name: liderUser.name,
		lastName: liderUser.lastName,
		typeIdentity: liderUser.typeIdentity,
		identityNumber: liderUser.identityNumber,
		email: liderUser.email,
		idRole: agentRole?.idRole || adminRole.idRole,
		idLevel: liderCategory?.idLevel || juniorCategory?.idLevel || null,
		entryDate: liderUser.entryDate,
		active: liderUser.active,
		ssoOnly: liderUser.ssoOnly,
	} as Prisma.UserUncheckedCreateInput

	let createdLiderId: number | null = null

	if (existingLider) {
		const updated = await prisma.user.update({
			where: { idUser: existingLider.idUser },
			data: liderData,
		})
		createdLiderId = updated.idUser
		console.log(`✅ Usuario actualizado: ${liderUser.name} (${liderUser.email})`)
	} else {
		const created = await prisma.user.create({ data: liderData })
		createdLiderId = created.idUser
		console.log(`✅ Usuario creado: ${liderUser.name} (${liderUser.email})`)
	}

	// 2.5.1.2 Procesar Agente Prueba (con líder asignado)
	console.log('👉 Procesando Agente Prueba…')
	const existingAgent = await prisma.user.findFirst({
		where: { email: agentUser.email },
	})

	const agentData = {
		name: agentUser.name,
		lastName: agentUser.lastName,
		typeIdentity: agentUser.typeIdentity,
		identityNumber: agentUser.identityNumber,
		email: agentUser.email,
		idRole: agentRole?.idRole || adminRole.idRole,
		idUserLeader: createdLiderId, // Asignar el líder recién creado/actualizado
		idLevel: juniorCategory?.idLevel || null,
		entryDate: agentUser.entryDate,
		active: agentUser.active,
		ssoOnly: agentUser.ssoOnly,
	} as Prisma.UserUncheckedCreateInput

	if (existingAgent) {
		await prisma.user.update({
			where: { idUser: existingAgent.idUser },
			data: agentData,
		})
		console.log(`✅ Usuario actualizado: ${agentUser.name} (${agentUser.email})`)
	} else {
		await prisma.user.create({ data: agentData })
		console.log(`✅ Usuario creado: ${agentUser.name} (${agentUser.email})`)
	}


	// 2.6 Usuario sistema Agencia (beneficiario fijo categoría AGENCIA)
	await seedAgenciaSystemUser(prisma, adminRole)

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
}
