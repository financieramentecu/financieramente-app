import { PrismaClient } from '@prisma/client'

export const roles = [
	{
		code: 'ADMIN',
		name: 'Administrador del Sistema',
		description: 'Acceso total a todos los módulos y configuración del sistema',
		active: true,
	},
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
	{
		code: 'CONSULTOR',
		name: 'Consultor (Solo Lectura)',
		description:
			'Acceso de solo lectura a Dashboard, Negocios, Reportes y Calculadora, sin permisos de escritura ni exportación',
		active: true,
	},
]

export async function seedRoles(prisma: PrismaClient) {
	console.log('\n👉 Procesando Roles...')

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
		console.log(`✅ Rol procesado: ${role.name} (${role.code})`)
	}
}
