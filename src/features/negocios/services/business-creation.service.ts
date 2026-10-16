import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '@/lib/prisma'
import { isDistributionExcludedLevel } from '@/features/shared/lib/level-codes'
import {
	resolveBusinessOwnerId,
	type AccessUser,
} from './business-access.service'
import { getPpcForNewBusinesses } from './product-configuration.service'

/**
 * Owner and commission resolution shared by `createBusiness` and the
 * pre-flight check that runs before any client is created (COM-41 NEG-02).
 */

export const PARTNER_PRODUCT_UNAVAILABLE_ERROR =
	'Este producto no está disponible para partners: no tiene configuración de comisión externa.'

const NO_NEW_BUSINESS_PPC_ERROR =
	'No hay configuración de comisión para nuevos negocios en esta combinación producto/categoría.'

export type BusinessCreationContext =
	| {
			ok: true
			idUser: number
			idLevel: number
			idProductPercentageCommission: number
	  }
	| { ok: false; error: string }

/**
 * `db` defaults to the shared Prisma client so Server Actions never import it;
 * pass a handle explicitly for tests.
 */
export async function resolveBusinessCreationContext(
	input: {
		sessionUser: AccessUser
		requestedIdUser: number
		idProduct: number
	},
	db: Pick<PrismaClient, 'user'> = sharedPrisma
): Promise<BusinessCreationContext> {
	const { sessionUser, requestedIdUser, idProduct } = input

	const owner = await resolveBusinessOwnerId(db, {
		user: sessionUser,
		requestedIdUser,
	})
	if (!owner.ok) return { ok: false, error: 'Sin permisos' }

	const user = await db.user.findUnique({
		where: { idUser: owner.idUser },
		select: { idLevel: true, level: { select: { code: true } } },
	})

	if (!user) {
		return { ok: false, error: 'El agente seleccionado no existe' }
	}
	if (!user.idLevel) {
		return {
			ok: false,
			error: 'El agente seleccionado no tiene un nivel asignado',
		}
	}

	const isPartnerOwner = isDistributionExcludedLevel(user.level?.code)
	const unavailable = (fallbackError: string): BusinessCreationContext => ({
		ok: false,
		error: isPartnerOwner ? PARTNER_PRODUCT_UNAVAILABLE_ERROR : fallbackError,
	})

	let lookup: Awaited<ReturnType<typeof getPpcForNewBusinesses>>
	try {
		lookup = await getPpcForNewBusinesses({ idProduct, idLevel: user.idLevel })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error(
			'Error finding product percentage commission:',
			message,
			error
		)
		return unavailable(message)
	}

	if (!lookup.ppc) return unavailable(NO_NEW_BUSINESS_PPC_ERROR)

	return {
		ok: true,
		idUser: owner.idUser,
		idLevel: user.idLevel,
		idProductPercentageCommission: lookup.ppc.idProductPercentageCommission,
	}
}
