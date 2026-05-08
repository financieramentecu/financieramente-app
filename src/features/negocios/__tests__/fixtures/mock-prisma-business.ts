/**
 * Fixtures para testing de datos de Prisma
 * Simula la estructura de datos que devuelve Prisma con relaciones
 */

import { Prisma } from '@prisma/client'
import type { PrismaBusinessWithRelations } from '@/features/negocios/types/business-prisma.types'

export type { PrismaBusinessWithRelations }

const baseDate = new Date('2024-01-15T10:00:00.000Z')

/**
 * Mock de Business de Prisma con todas las relaciones
 */
export const mockPrismaBusiness: PrismaBusinessWithRelations = {
	idBusiness: 1,
	contract: 'PN0001234',
	term: 12,
	value: new Prisma.Decimal(15000000),
	observations: null,
	idBuyPeriodicity: 1,
	idUser: 2,
	idClient: 1,
	idProductPercentageCommission: 1,
	idCurrency: 1,
	idClientOrigin: 1,
	status: 'VENTA_EFECTUADA',
	isActive: true,
	createdAt: baseDate,
	updatedAt: baseDate,
	dateIssued: null,
	dateAnchored: null,
	numAportes: null,
	_count: { payments: 0 },
	payments: [],
	client: {
		idClient: 1,
		name: 'María',
		lastName: 'García López',
		typeIdentity: 'CC',
		identityNumber: '1234567890',
		email: 'maria.garcia@email.com',
		phone: '3001234567',
		direcction: 'Calle 123 #45-67',
		city: 'Medellín',
		country: 'Colombia',
		active: true,
		createdAt: baseDate,
		updatedAt: baseDate,
	},
	user: {
		idUser: 2,
		name: 'Carlos',
		lastName: 'Money Strategist Pérez',
		typeIdentity: 'CC',
		identityNumber: '9876543210',
		email: 'carlos.agente@financieramente.com',
		password: null,
		ssoOnly: true,
		phone: '3009876543',
		idCategoria: 1,
		idRole: 2,
		idUserLeader: null,
		entryDate: baseDate,
		retirementDate: null,
		active: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		role: {
			idRole: 2,
			code: 'AGENTE',
			name: 'Money Strategist',
			description: 'Solo acceso a sus propios negocios',
			active: true,
			createdAt: baseDate,
			updatedAt: baseDate,
		},
		category: {
			name: 'Junior',
		},
	},
	productPercentageCommission: {
		idProductPercentageCommission: 1,
		idProductConfiguration: 1,
		active: true,
		description: null,
		hasPortfolio: false,
		createdAt: baseDate,
		updatedAt: baseDate,
		productConfiguration: {
			id: 1,
			idProduct: 1,
			idCategory: 1,
			code: 'SKANDIA-CREA_PATRIMONIO-JUNIOR',
			active: true,
			idProductPercentageCommissionNewBusinesses: 1,
			createdAt: baseDate,
			updatedAt: baseDate,
			product: {
				idProduct: 1,
				idCompany: 1,
				name: 'Crédito Personal',
				description: 'Crédito de libre inversión',
				idTypeProduct: 1,
				status: true,
				createdAt: baseDate,
				updatedAt: baseDate,
				company: {
					idCompany: 1,
					name: 'Skandia',
					idTypeCompany: 'NACIONAL',
					idCurrency: 1,
					status: true,
					createdAt: baseDate,
					updatedAt: baseDate,
				},
			},
		},
	},
	currency: {
		idCurrency: 1,
		name: 'COP',
		symbol: '$',
		active: true,
		createdAt: baseDate,
		updatedAt: baseDate,
	},
	buyPeriodicity: {
		idBuyPeriodicity: 1,
		name: 'Mensual',
		active: true,
		createdAt: baseDate,
		updatedAt: baseDate,
	},
	clientOrigin: {
		idClientOrigin: 1,
		name: 'Referido',
		description: 'Cliente referido por otro cliente',
		status: true,
		createdAt: baseDate,
		updatedAt: baseDate,
	},
}

/**
 * Mock de Business sin contrato (VENTA_EFECTUADA)
 */
export const mockPrismaBusinessVentaEfectuada: PrismaBusinessWithRelations = {
	...mockPrismaBusiness,
	contract: null,
	status: 'VENTA_EFECTUADA',
}

/**
 * Mock de Business con contrato (EMITIDO)
 */
export const mockPrismaBusinessEmitido: PrismaBusinessWithRelations = {
	...mockPrismaBusiness,
	idBusiness: 2,
	contract: 'PN0005678',
	status: 'EMITIDO',
}

/**
 * Mock de Business cancelado
 */
export const mockPrismaBusinessCancelado: PrismaBusinessWithRelations = {
	...mockPrismaBusiness,
	idBusiness: 3,
	contract: 'PN0009999',
	status: 'CANCELADO',
}

/**
 * Mock de Business sin periodicidad (opcional)
 */
export const mockPrismaBusinessWithoutPeriodicity: PrismaBusinessWithRelations =
	{
		...mockPrismaBusiness,
		idBusiness: 4,
		idBuyPeriodicity: null,
		buyPeriodicity: null,
	}

/**
 * Mock de Business con cliente sin lastName
 */
export const mockPrismaBusinessClientNoLastName: PrismaBusinessWithRelations = {
	...mockPrismaBusiness,
	idBusiness: 5,
	client: {
		...mockPrismaBusiness.client,
		lastName: null,
	},
}
