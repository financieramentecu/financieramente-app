import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seed de roles del sistema
 *
 * Ejecutar con: npx tsx prisma/seed.ts
 * O agregar al package.json: "prisma": { "seed": "tsx prisma/seed.ts" }
 */
async function main() {
	console.log('🌱 Iniciando seed de roles...')

	// Crear roles si no existen
	const roles = [
		{
			code: 'DEFAULT',
			name: 'Default',
			description:
				'Rol por defecto asignado a usuarios nuevos pendientes de activación',
			active: true,
		},
		{
			code: 'ASISTENTE_GERENCIA_OPERATIVA',
			name: 'Asistente Operativo de Gerencia',
			description: 'Acceso completo al sistema excepto administración',
			active: true,
		},
		{
			code: 'ANALISTA_SOPORTE',
			name: 'Analista de Soporte',
			description: 'Acceso limitado a negocios y reportes de negocio',
			active: true,
		},
		{
			code: 'AGENTE',
			name: 'Agente/Coach',
			description: 'Solo acceso a sus propios negocios y reportes personales',
			active: true,
		},
	]

	for (const roleData of roles) {
		const role = await prisma.role.upsert({
			where: { code: roleData.code },
			update: {
				name: roleData.name,
				description: roleData.description,
				active: roleData.active,
			},
			create: roleData,
		})
		console.log(`✅ Rol creado/actualizado: ${role.name} (${role.code})`)
	}

	console.log('✨ Seed completado!')
}

main()
	.catch((e) => {
		console.error('❌ Error en seed:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
