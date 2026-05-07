import { PrismaClient } from '@prisma/client'

export const categoryTypes = [
	{ name: 'MIA', description: 'Sistema de Múltiples Niveles' },
]

/**
 * Seed data for the 7 standard categories.
 * oldCode: code as it may exist in DB before migration.
 * code/name/color/beneficiaryMode: target values after seed.
 */
const CATEGORY_SEED_DATA = [
	{
		oldCode: 'JUNIOR',
		code: 'MS_JUNIOR',
		name: 'MS Junior',
		color: '#10b981',
		beneficiaryMode: 'OVERRIDE' as const,
		type: 'MIA',
	},
	{
		oldCode: 'SENIOR',
		code: 'MS_SENIOR',
		name: 'MS Senior',
		color: '#3b82f6',
		beneficiaryMode: 'OVERRIDE' as const,
		type: 'MIA',
	},
	{
		oldCode: 'LIDER',
		code: 'TEAM_LEADER',
		name: 'Team Leader',
		color: '#8b5cf6',
		beneficiaryMode: 'OVERRIDE' as const,
		type: 'MIA',
	},
	{
		oldCode: 'COACH',
		code: 'PERFORMANCE_LEADER',
		name: 'Performance Leader',
		color: '#f59e0b',
		beneficiaryMode: 'OVERRIDE' as const,
		type: 'MIA',
	},
	{
		oldCode: 'GENERAL',
		code: 'BUSINESS_LEADER',
		name: 'Business Leader',
		color: '#ef4444',
		beneficiaryMode: 'OVERRIDE' as const,
		type: 'MIA',
	},
	{
		oldCode: 'PRESIDENTE',
		code: 'PARTNER',
		name: 'Partner',
		color: '#ec4899',
		beneficiaryMode: 'OVERRIDE' as const,
		type: 'MIA',
	},
	{
		oldCode: 'AGENCIA',
		code: 'MIA',
		name: 'MIA',
		color: '#6366f1',
		beneficiaryMode: 'BENEFICIARIO_GENERAL' as const,
		type: 'MIA',
	},
]

/**
 * Hierarchy chain: each code points to the next one (null = top of chain)
 * MS_JUNIOR → MS_SENIOR → TEAM_LEADER → PERFORMANCE_LEADER → BUSINESS_LEADER → PARTNER → MIA (null)
 */
const NEXT_CATEGORY_CHAIN: Array<{ code: string; nextCode: string | null }> = [
	{ code: 'MS_JUNIOR', nextCode: 'MS_SENIOR' },
	{ code: 'MS_SENIOR', nextCode: 'TEAM_LEADER' },
	{ code: 'TEAM_LEADER', nextCode: 'PERFORMANCE_LEADER' },
	{ code: 'PERFORMANCE_LEADER', nextCode: 'BUSINESS_LEADER' },
	{ code: 'BUSINESS_LEADER', nextCode: 'PARTNER' },
	{ code: 'PARTNER', nextCode: 'MIA' },
	{ code: 'MIA', nextCode: null },
]

const MIA_SYSTEM_USER_EMAIL = 'agencia@financieramentecu.com'

export async function seedCategories(prisma: PrismaClient) {
	console.log('\n👉 Procesando Tipos de Categorías (CategoryTypes)...')

	const typeMap = new Map<string, number>()

	for (const ct of categoryTypes) {
		const existing = await prisma.categoryType.findUnique({
			where: { name: ct.name },
		})

		if (existing) {
			const updated = await prisma.categoryType.update({
				where: { id: existing.id },
				data: { description: ct.description, status: true },
			})
			typeMap.set(ct.name, updated.id)
			console.log(`✅ Tipo de Categoría actualizado: ${ct.name}`)
		} else {
			const created = await prisma.categoryType.create({
				data: { name: ct.name, description: ct.description, status: true },
			})
			typeMap.set(ct.name, created.id)
			console.log(`✅ Tipo de Categoría creado: ${ct.name}`)
		}
	}

	// ─── Pass 1: Upsert categories by old code → update to new code/name/color/mode ───
	console.log('\n👉 Pass 1 — Upsert categorías con nuevos códigos y colores...')

	for (const cat of CATEGORY_SEED_DATA) {
		const idCategoryType = typeMap.get(cat.type)
		if (!idCategoryType) {
			console.error(`❌ Tipo de categoría no encontrado para: ${cat.type}`)
			continue
		}

		// Try finding by old code first, then by new code (idempotent re-runs)
		const existing =
			(await prisma.category.findUnique({ where: { code: cat.oldCode } })) ??
			(await prisma.category.findUnique({ where: { code: cat.code } }))

		if (existing) {
			await prisma.category.update({
				where: { idCategory: existing.idCategory },
				data: {
					code: cat.code,
					name: cat.name,
					color: cat.color,
					beneficiaryMode: cat.beneficiaryMode,
					idCategoryType,
					status: true,
				},
			})
			console.log(
				`✅ Categoría actualizada: ${cat.name} (${cat.oldCode} → ${cat.code})`
			)
		} else {
			await prisma.category.create({
				data: {
					code: cat.code,
					name: cat.name,
					color: cat.color,
					beneficiaryMode: cat.beneficiaryMode,
					idCategoryType,
					status: true,
				},
			})
			console.log(`✅ Categoría creada: ${cat.name} (${cat.code})`)
		}
	}

	// ─── Pass 2: Set idNextCategory links ───
	console.log(
		'\n👉 Pass 2 — Vinculando cadena de categorías (idNextCategory)...'
	)

	for (const link of NEXT_CATEGORY_CHAIN) {
		const category = await prisma.category.findUnique({
			where: { code: link.code },
		})
		if (!category) {
			console.warn(`⚠️  Categoría no encontrada: ${link.code}`)
			continue
		}

		let idNextCategory: number | null = null
		if (link.nextCode) {
			const nextCat = await prisma.category.findUnique({
				where: { code: link.nextCode },
			})
			if (!nextCat) {
				console.warn(`⚠️  Siguiente categoría no encontrada: ${link.nextCode}`)
			} else {
				idNextCategory = nextCat.idCategory
			}
		}

		await prisma.category.update({
			where: { idCategory: category.idCategory },
			data: { idNextCategory },
		})
		console.log(
			`✅ ${link.code} → ${link.nextCode ?? 'null'} (idNextCategory: ${idNextCategory ?? 'null'})`
		)
	}

	// ─── Pass 3: Set idFixedBeneficiaryUser for MIA ───
	console.log('\n👉 Pass 3 — Vinculando MIA con usuario sistema...')
	await seedMiaBeneficiaryLink(prisma)
}

/**
 * Sets BENEFICIARIO_GENERAL + idFixedBeneficiaryUser for MIA using the system user.
 * Looks up the user by the known email; falls back to searching by name "Agencia".
 */
export async function seedMiaBeneficiaryLink(prisma: PrismaClient) {
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

	const mia = await prisma.category.findUnique({ where: { code: 'MIA' } })
	if (!mia) {
		console.warn('⚠️  Categoría MIA no encontrada; omitiendo vínculo.')
		return
	}

	await prisma.category.update({
		where: { idCategory: mia.idCategory },
		data: {
			beneficiaryMode: 'BENEFICIARIO_GENERAL',
			idFixedBeneficiaryUser: systemUser.idUser,
		},
	})
	console.log(
		`✅ MIA vinculada con usuario sistema: ${systemUser.name} (id: ${systemUser.idUser})`
	)
}

/**
 * @deprecated Use seedCategories (which now performs all 3 passes inline)
 */
export async function seedCategoryBeneficiaryLinks(prisma: PrismaClient) {
	await seedMiaBeneficiaryLink(prisma)
}
