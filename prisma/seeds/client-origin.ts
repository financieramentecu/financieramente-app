import { PrismaClient } from '@prisma/client'

export const clientOrigins = ['Propio', 'Metodo Vortex', 'Asesoria Gratuita']

export async function seedClientOrigins(prisma: PrismaClient) {
	console.log('\n👉 Procesando Orígenes de Cliente (ClientOrigins)...')

	for (const name of clientOrigins) {
		const existing = await prisma.clientOrigin.findFirst({
			where: { name },
		})

		if (existing) {
			await prisma.clientOrigin.update({
				where: { idClientOrigin: existing.idClientOrigin },
				data: { status: true },
			})
			console.log(`✅ Origen actualizado: ${name}`)
		} else {
			await prisma.clientOrigin.create({
				data: { name, status: true },
			})
			console.log(`✅ Origen creado: ${name}`)
		}
	}
}
