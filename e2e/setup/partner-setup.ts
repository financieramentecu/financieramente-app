import { PrismaClient } from '@prisma/client'
import { findCitizenshipCardId } from '../../prisma/seeds/document-type'
import {
	computeTokenExpiry,
	generateRawToken,
	hashToken,
} from '../../src/features/auth/lib/account-token'

/**
 * DB helpers for the partner-profile e2e spec.
 *
 * Activation tokens only travel in the email link (their hash is the only
 * persisted form), so the spec cannot read them from the UI or from logs.
 * Instead, it asks this helper to issue a fresh ACTIVATION token for the
 * partner, using the same primitives as the production service (raw token
 * generation + SHA-256 hash). Nothing here is imported by application code.
 */

// Lazy so that dotenv has already populated DATABASE_URL (see global-setup).
let prismaClient: PrismaClient | null = null
function getPrisma(): PrismaClient {
	if (!prismaClient) prismaClient = new PrismaClient()
	return prismaClient
}

export async function disconnectPartnerSetup(): Promise<void> {
	if (prismaClient) {
		await prismaClient.$disconnect()
		prismaClient = null
	}
}

/**
 * Revokes the open activation tokens of the user and stores a new one.
 * Returns the RAW token so the spec can open `/activate-account?token=...`.
 */
export async function issueActivationTokenForE2E(
	email: string
): Promise<string> {
	const prisma = getPrisma()
	const user = await prisma.user.findUnique({
		where: { email: email.trim().toLowerCase() },
		select: { idUser: true },
	})
	if (!user) throw new Error(`E2E: user ${email} not found`)

	const now = new Date()
	await prisma.accountToken.updateMany({
		where: {
			idUser: user.idUser,
			type: 'ACTIVATION',
			usedAt: null,
			revokedAt: null,
		},
		data: { revokedAt: now },
	})

	const rawToken = generateRawToken()
	await prisma.accountToken.create({
		data: {
			idUser: user.idUser,
			type: 'ACTIVATION',
			tokenHash: hashToken(rawToken),
			expiresAt: computeTokenExpiry('ACTIVATION', now),
		},
	})
	return rawToken
}

/**
 * Makes sure a known active user sits in a leader level (LEVEL_1..LEVEL_5)
 * so it appears in the partner leader picker. Returns the user's full name as
 * rendered by the picker.
 */
export async function ensureLeaderForE2E(
	email: string,
	levelCode: string
): Promise<string> {
	const prisma = getPrisma()
	const level = await prisma.level.findUnique({
		where: { code: levelCode },
		select: { idLevel: true },
	})
	if (!level) throw new Error(`E2E: level ${levelCode} not found`)

	const user = await prisma.user.update({
		where: { email },
		data: { idLevel: level.idLevel, active: true },
		select: { name: true, lastName: true },
	})
	return `${user.name} ${user.lastName ?? ''}`.trim()
}

/**
 * Inserts one business owned by the partner (PARTNER_EXTERNAL configuration),
 * so leaders and the dashboard have partner data to show without driving the
 * full creation form. Returns the contract number.
 */
export async function seedPartnerBusinessForE2E(
	partnerEmail: string
): Promise<string> {
	const prisma = getPrisma()
	const partner = await prisma.user.findUnique({
		where: { email: partnerEmail },
		select: { idUser: true },
	})
	if (!partner) throw new Error(`E2E: partner ${partnerEmail} not found`)

	const ppc = await prisma.productPercentageCommission.findFirst({
		where: {
			active: true,
			productConfiguration: { level: { code: 'PARTNER_EXTERNAL' } },
		},
		select: { idProductPercentageCommission: true },
	})
	const currency = await prisma.currency.findFirst({
		where: { active: true },
		select: { idCurrency: true },
	})
	const origin = await prisma.clientOrigin.findFirst({
		where: { status: true },
		select: { idClientOrigin: true },
	})
	if (!ppc || !currency || !origin) {
		throw new Error(
			'E2E: missing PARTNER_EXTERNAL configuration, currency or origin (run npm run prisma:seed:partner)'
		)
	}

	const suffix = `${Date.now()}`
	const idDocumentType = await findCitizenshipCardId(prisma)
	const client = await prisma.client.create({
		data: {
			name: 'Cliente E2E',
			lastName: 'Partner',
			typeIdentity: 'CC',
			idDocumentType,
			identityNumber: `7${suffix.slice(-9)}`,
		},
		select: { idClient: true },
	})

	const contract = `E2E-PARTNER-${suffix}`
	await prisma.business.create({
		data: {
			contract,
			term: 12,
			value: 1000000,
			idUser: partner.idUser,
			idClient: client.idClient,
			idProductPercentageCommission: ppc.idProductPercentageCommission,
			idCurrency: currency.idCurrency,
			idClientOrigin: origin.idClientOrigin,
			status: 'VENTA_EFECTUADA',
		},
	})
	return contract
}
