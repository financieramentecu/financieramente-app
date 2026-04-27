import { AnnualPaymentStatus, Prisma } from '@prisma/client'

// ============================================
// SELECTOR DE PRISMA
// ============================================

/**
 * Selector de Prisma para incluir todas las relaciones necesarias
 * Se usa en las queries de la API
 */
export const businessWithRelations = {
	client: true,
	user: {
		include: {
			role: true,
			category: {
				select: {
					name: true,
				},
			},
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
	/** Solo cuotas pendientes — para `hasPendingAnnualFunding` en mapper */
	annualPayments: {
		where: { status: AnnualPaymentStatus.SIN_FONDEAR },
		select: { idAnnualPayment: true },
	},
	_count: {
		select: {
			annualPayments: true,
		},
	},
} satisfies Prisma.BusinessInclude

/**
 * Tipo derivado de Prisma con todas las relaciones
 */
export type PrismaBusinessWithRelations = Prisma.BusinessGetPayload<{
	include: typeof businessWithRelations
}>

export type UserWithRole = Prisma.UserGetPayload<{
	include: {
		role: true
	}
}>

export type CurrentUser = UserWithRole
