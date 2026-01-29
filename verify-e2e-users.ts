import { validateUserCredentials } from './src/features/auth/lib/user-validation'
import { prisma } from './src/lib/prisma'

async function verifyUsers() {
	console.log('Verificando usuarios...')

	const users = [
		{
			email: 'admin@financieramentecu.com',
			password: 'Admin123!',
			expectedValid: true,
		},
		{
			email: 'admin-sso@financieramentecu.com',
			password: 'Admin123!',
			expectedValid: false,
		}, // ssoOnly=true
		{
			email: 'pro@financieramentecu.com',
			password: 'Pro123!',
			expectedValid: false,
		}, // role restriction
		{
			email: 'agente@financieramentecu.com',
			password: 'Agente123!',
			expectedValid: false,
		}, // role restriction
	]

	for (const u of users) {
		console.log(`\nProbando ${u.email}...`)

		// Verificar existencia en DB
		const dbUser = await prisma.user.findUnique({
			where: { email: u.email },
			include: { role: true },
		})

		if (!dbUser) {
			console.error(`❌ Usuario no encontrado en DB: ${u.email}`)
			continue
		}

		console.log(
			`   Encontrado: ID=${dbUser.idUser}, Role=${dbUser.role?.code}, SSO=${dbUser.ssoOnly}, Active=${dbUser.active}`
		)

		// Probar validación
		const result = await validateUserCredentials(u.email, u.password)
		console.log(
			`   Resultado validación: isValid=${result.isValid}, Error=${result.error}`
		)

		if (result.isValid === u.expectedValid) {
			console.log(`   ✅ Comportamiento esperado`)
		} else {
			console.error(
				`   ❌ Comportamiento INESPERADO. Esperaba isValid=${u.expectedValid}`
			)
		}
	}
}

verifyUsers()
	.catch((e) => console.error(e))
	.finally(() => prisma.$disconnect())
