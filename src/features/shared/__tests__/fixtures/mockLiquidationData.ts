import type { LiquidationDetail } from '@/features/shared/types/liquidation.types'

export const mockLiquidationDetails: LiquidationDetail[] = [
	{
		id: 'LIQ-001',
		status: 'Efectuada',
		amount: 400.95,
		currency: 'USD',

		client: {
			name: 'John Agudelo',
			identification: '1053',
			identificationType: 'C.C.',
			status: 'activo',
			email: 'john.agudelo@gmail.com',
			contactNumber: '+57 320 555 55 55',
		},

		agent: {
			name: 'Vanesa Cardona',
			role: 'Agente',
			email: 'vanesa.cardona@gmail.com',
			contactNumber: '+57 310 555 55 55',
		},

		insurance: {
			code: 'PN0001265',
			name: 'Skandia',
		},

		product: {
			name: 'Nombre producto',
			date: 'Mayo 13, 025',
			term: 34,
			periodicity: 34,
		},
	},
]
