import { PrismaClient } from '@prisma/client'
import { agentUser } from './user'

export async function seedClawbackBalance(prisma: PrismaClient) {
	console.log('\n👉 Procesando Saldo de Clawback (ClawbackBalance)...')

	// 1. Obtener el usuario agente
	const user = await prisma.user.findFirst({
		where: { email: agentUser.email },
	})

	if (!user) {
		console.error(
			`❌ Error: No se encontró el usuario agente (${agentUser.email}). Asegúrate de ejecutar seedUsers primero.`
		)
		return
	}

	const balanceAmount = '500000' // $500,000 de prueba (Usamos string para evitar problemas de precisión con Decimal)

	const existingBalance = await prisma.clawbackBalance.findUnique({
		where: { idUser: user.idUser },
	})

	if (existingBalance) {
		await prisma.clawbackBalance.update({
			where: { idUser: user.idUser },
			data: {
				totalAmount: balanceAmount,
			},
		})
		console.log(
			`✅ Saldo de Clawback actualizado para ${user.email}: $${balanceAmount}`
		)
	} else {
		await prisma.clawbackBalance.create({
			data: {
				idUser: user.idUser,
				totalAmount: balanceAmount,
			},
		})
		console.log(
			`✅ Saldo de Clawback creado para ${user.email}: $${balanceAmount}`
		)
	}
}
