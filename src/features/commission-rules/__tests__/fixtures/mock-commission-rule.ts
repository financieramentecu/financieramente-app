import { type CommissionRule } from '../../types/commission-rule.types'
import { Decimal } from '@prisma/client/runtime/library'

export const mockCommissionRule: CommissionRule = {
	idProductPercentageCommission: 1,
	idProductConfiguration: 101,
	description: 'Regla Estándar 2024',
	active: true,
	createdAt: new Date('2024-01-01T00:00:00Z'),
	updatedAt: new Date('2024-01-01T00:00:00Z'),
	categories: [
		{
			id: 1,
			idCategory: 5,
			idProductPercentageCommission: 1,
			porcentajeDistribucion: new Decimal(0.15),
			active: true,
			createdAt: new Date('2024-01-01T00:00:00Z'),
			updatedAt: new Date('2024-01-01T00:00:00Z'),
			category: {
				idCategory: 5,
				code: 'CAT-001',
				name: 'Agencia',
				typeCategory: 'ALIADO',
				descripcion: 'Agencia externa',
				status: true,
				createdAt: new Date('2024-01-01T00:00:00Z'),
				updatedAt: new Date('2024-01-01T00:00:00Z'),
			},
		},
	],
}

export const mockCreateCommissionRuleInput = {
	idProductConfiguration: 101,
	description: 'Nueva Regla',
	categories: [
		{
			idCategory: 5,
			percentage: 15, // 15%
		},
	],
}
