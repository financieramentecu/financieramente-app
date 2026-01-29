import { UserRole } from '@/features/auth/lib/roles'
import { UserWithRole } from '@/features/negocios/types/business.types'

/**
 * Mock de usuario con rol para testing
 */
export const mockUserWithRole: UserWithRole = {
	idUser: 1,
	name: 'Test',
	lastName: 'User',
	typeIdentity: 'CC',
	identityNumber: '1234567890',
	email: 'test@example.com',
	password: null,
	ssoOnly: false,
	phone: '3001234567',
	idCategoria: null,
	idRole: 1,
	idUserLeader: null,
	entryDate: new Date('2024-01-01'),
	retirementDate: null,
	active: true,
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
	role: {
		idRole: 1,
		code: UserRole.ANALISTA_SOPORTE,
		name: 'Analista de Soporte',
		description: 'Acceso limitado a negocios y reportes de negocio',
		active: true,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
	},
}

/**
 * Mock de usuario agente para testing
 */
export const mockAgentUser: UserWithRole = {
	...mockUserWithRole,
	idUser: 2,
	email: 'agent@example.com',
	idRole: 2,
	role: {
		idRole: 2,
		code: UserRole.AGENTE,
		name: 'Agente/Coach',
		description: 'Solo acceso a sus propios negocios y reportes personales',
		active: true,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
	},
}
