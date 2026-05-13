import { PrismaClient } from '@prisma/client'

const MIA_SYSTEM_USER_EMAIL = 'agencia@financieramentecu.com'

/**
 * Seed data for the 7 standard levels.
 * oldCode: code as it may exist in DB before migration.
 * code/name/color/beneficiaryMode: target values after seed.
 */
const LEVEL_SEED_DATA = [
	{
		oldCode: 'MS_JUNIOR',
		code: 'LEVEL_0',
		name: 'MS Junior',
		color: '#10b981',
		beneficiaryMode: 'OVERRIDE' as const,
	},
	{
		oldCode: 'MS_SENIOR',
		code: 'LEVEL_1',
		name: 'MS Senior',
		color: '#3b82f6',
		beneficiaryMode: 'OVERRIDE' as const,
	},
	{
		oldCode: 'TEAM_LEADER',
		code: 'LEVEL_2',
		name: 'Team Leader',
		color: '#8b5cf6',
		beneficiaryMode: 'OVERRIDE' as const,
	},
	{
		oldCode: 'PERFORMANCE_LEADER',
		code: 'LEVEL_3',
		name: 'Performance Leader',
		color: '#f59e0b',
		beneficiaryMode: 'OVERRIDE' as const,
	},
	{
		oldCode: 'BUSINESS_LEADER',
		code: 'LEVEL_4',
		name: 'Business Leader',
		color: '#ef4444',
		beneficiaryMode: 'OVERRIDE' as const,
	},
	{
		oldCode: 'PARTNER',
		code: 'LEVEL_5',
		name: 'Partner',
		color: '#ec4899',
		beneficiaryMode: 'OVERRIDE' as const,
	},
	{
		oldCode: 'MIA',
		code: 'GENERAL_LEVEL',
		name: 'MIA',
		color: '#6366f1',
		beneficiaryMode: 'BENEFICIARIO_GENERAL' as const,
	},
]

/**
 * Hierarchy chain: each code points to the next one (null = top of chain)
 * LEVEL_0 → LEVEL_1 → LEVEL_2 → LEVEL_3 → LEVEL_4 → LEVEL_5 → GENERAL_LEVEL (null)
 */
const NEXT_LEVEL_CHAIN: Array<{ code: string; nextCode: string | null }> = [
	{ code: 'LEVEL_0', nextCode: 'LEVEL_1' },
	{ code: 'LEVEL_1', nextCode: 'LEVEL_2' },
	{ code: 'LEVEL_2', nextCode: 'LEVEL_3' },
	{ code: 'LEVEL_3', nextCode: 'LEVEL_4' },
	{ code: 'LEVEL_4', nextCode: 'LEVEL_5' },
	{ code: 'LEVEL_5', nextCode: 'GENERAL_LEVEL' },
	{ code: 'GENERAL_LEVEL', nextCode: null },
]

export async function seedLevels(prisma: PrismaClient) {
	// ─── Pass 1: Upsert levels by old code → update to new code/name/color/mode ───
	console.log('\n👉 Pass 1 — Upsert niveles con nuevos códigos y colores...')

	for (const lv of LEVEL_SEED_DATA) {
		// Try finding by old code first, then by new code (idempotent re-runs)
		const existing =
			(await prisma.level.findUnique({ where: { code: lv.oldCode } })) ??
			(await prisma.level.findUnique({ where: { code: lv.code } }))

		// BENEFICIARIO_GENERAL requires idFixedBeneficiaryUser (check constraint).
		// Always use OVERRIDE here; Pass 3 sets the final mode + user atomically.
		const safeBeneficiaryMode =
			lv.beneficiaryMode === 'BENEFICIARIO_GENERAL' ? 'OVERRIDE' : lv.beneficiaryMode

		if (existing) {
			await prisma.level.update({
				where: { idLevel: existing.idLevel },
				data: {
					code: lv.code,
					name: lv.name,
					color: lv.color,
					beneficiaryMode: safeBeneficiaryMode,
					status: true,
				},
			})
			console.log(
				`✅ Nivel actualizado: ${lv.name} (${lv.oldCode} → ${lv.code})`
			)
		} else {
			await prisma.level.create({
				data: {
					code: lv.code,
					name: lv.name,
					color: lv.color,
					beneficiaryMode: safeBeneficiaryMode,
					status: true,
				},
			})
			console.log(`✅ Nivel creado: ${lv.name} (${lv.code})`)
		}
	}

	// ─── Pass 2: Set idNextLevel links ───
	console.log('\n👉 Pass 2 — Vinculando cadena de niveles (idNextLevel)...')

	for (const link of NEXT_LEVEL_CHAIN) {
		const level = await prisma.level.findUnique({
			where: { code: link.code },
		})
		if (!level) {
			console.warn(`⚠️  Nivel no encontrado: ${link.code}`)
			continue
		}

		let idNextLevel: number | null = null
		if (link.nextCode) {
			const nextLevel = await prisma.level.findUnique({
				where: { code: link.nextCode },
			})
			if (!nextLevel) {
				console.warn(`⚠️  Siguiente nivel no encontrado: ${link.nextCode}`)
			} else {
				idNextLevel = nextLevel.idLevel
			}
		}

		await prisma.level.update({
			where: { idLevel: level.idLevel },
			data: { idNextLevel },
		})
		console.log(
			`✅ ${link.code} → ${link.nextCode ?? 'null'} (idNextLevel: ${idNextLevel ?? 'null'})`
		)
	}

	// ─── Pass 3: Set idFixedBeneficiaryUser for GENERAL_LEVEL ───
	console.log('\n👉 Pass 3 — Vinculando GENERAL_LEVEL con usuario sistema...')
	await seedGeneralLevelBeneficiaryLink(prisma)
}

/**
 * Sets BENEFICIARIO_GENERAL + idFixedBeneficiaryUser for GENERAL_LEVEL using the system user.
 * Looks up the user by the known email; falls back to searching by name "Agencia".
 */
export async function seedGeneralLevelBeneficiaryLink(prisma: PrismaClient) {
	let systemUser = await prisma.user.findUnique({
		where: { email: MIA_SYSTEM_USER_EMAIL },
	})

	if (!systemUser) {
		// Fallback: search by name fragment
		systemUser = await prisma.user.findFirst({
			where: { name: { contains: 'Agencia', mode: 'insensitive' } },
		})
	}

	if (!systemUser) {
		console.warn(
			`⚠️  Usuario sistema MIA (${MIA_SYSTEM_USER_EMAIL}) no encontrado; omitiendo vínculo de beneficiario fijo.`
		)
		return
	}

	const generalLevel = await prisma.level.findUnique({
		where: { code: 'GENERAL_LEVEL' },
	})
	if (!generalLevel) {
		console.warn('⚠️  Nivel GENERAL_LEVEL no encontrado; omitiendo vínculo.')
		return
	}

	await prisma.level.update({
		where: { idLevel: generalLevel.idLevel },
		data: {
			beneficiaryMode: 'BENEFICIARIO_GENERAL',
			idFixedBeneficiaryUser: systemUser.idUser,
		},
	})
	console.log(
		`✅ GENERAL_LEVEL vinculado con usuario sistema: ${systemUser.name} (id: ${systemUser.idUser})`
	)
}

/**
 * @deprecated Use seedLevels (which now performs all 3 passes inline)
 */
export async function seedLevelBeneficiaryLinks(prisma: PrismaClient) {
	await seedGeneralLevelBeneficiaryLink(prisma)
}
