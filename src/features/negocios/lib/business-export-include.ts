import type { Prisma } from '@prisma/client'

/**
 * Include Prisma para export Excel: todas las anualidades ordenadas,
 * categoría del coach (`user.category`).
 */
export const businessExportInclude = {
	client: true,
	user: {
		include: {
			role: true,
			category: { select: { name: true } },
		},
	},
	productPercentageCommission: {
		include: {
			productConfiguration: {
				include: {
					product: {
						include: {
							company: true,
						},
					},
				},
			},
		},
	},
	currency: true,
	buyPeriodicity: true,
	clientOrigin: true,
	annualPayments: {
		orderBy: { installmentIndex: 'asc' },
	},
} satisfies Prisma.BusinessInclude

export type BusinessExportPayload = Prisma.BusinessGetPayload<{
	include: typeof businessExportInclude
}>
