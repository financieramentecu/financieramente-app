import type { PrismaClient } from '@prisma/client'
import {
	applyMissingBaseConfigurations,
	previewMissingBaseConfigurations,
	type BaseConfigurationApplyResult,
} from '../../src/features/product/services/remediate-base-configurations.service'
import {
	REMEDIATION_PROBLEM,
	type RemediationProblem,
} from '../../src/features/product/lib/base-product-configurations'
import { PARTNER_EXTERNAL_LEVEL_CODE } from '../../src/features/shared/lib/level-codes'
import { PARTNER_EXTERNAL_CATEGORY_SEED, upsertCategory } from './category'
import { PARTNER_EXTERNAL_LEVEL_SEED, upsertLevel } from './level'
import { PARTNER_ROLE } from './roles'

/**
 * Raised when the partner seed leaves an active product without a
 * PARTNER_EXTERNAL configuration that has a PPC flagged for new businesses.
 */
export class PartnerSeedCoverageError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PartnerSeedCoverageError'
	}
}

/** Products applied per transaction when creating PARTNER_EXTERNAL configs. */
export const PARTNER_REMEDIATION_BATCH_SIZE = 5

/**
 * Manual codes for products whose generated PARTNER_EXTERNAL code exceeds the
 * VarChar(50) column. Keyed by the generated code (not the product id) so it
 * holds across environments where ids differ.
 */
export const PARTNER_CODE_OVERRIDES: Readonly<Record<string, string>> = {
	'AFIBL-SELEC_TERM_TO_A_85_&_TO_A_100-PARTNER_EXTERNAL':
		'AFIBL-SELEC_TERM_TO_A_85_TO_A_100-PARTNER_EXTERNAL',
}

export interface PartnerRemediationResult extends BaseConfigurationApplyResult {
	readonly problems: readonly RemediationProblem[]
}

/**
 * Idempotently creates role PARTNER, level PARTNER_EXTERNAL and category
 * "Partner Externo" (MIA). Touches nothing else (LEVEL_5 stays as is).
 */
export async function seedPartnerReferenceData(prisma: PrismaClient) {
	console.log('\n👉 Procesando datos de referencia de Partner...')

	const role = await prisma.role.upsert({
		where: { code: PARTNER_ROLE.code },
		update: {
			name: PARTNER_ROLE.name,
			description: PARTNER_ROLE.description,
			active: PARTNER_ROLE.active,
		},
		create: PARTNER_ROLE,
	})
	console.log(`✅ Rol procesado: ${role.name} (${role.code})`)

	await upsertLevel(prisma, PARTNER_EXTERNAL_LEVEL_SEED)
	await upsertCategory(prisma, PARTNER_EXTERNAL_CATEGORY_SEED)
}

/**
 * Creates the missing PARTNER_EXTERNAL configuration (and its PPC) for every
 * active product. Other levels in the base plan are intentionally ignored so
 * the standalone partner seed never adds unrelated data.
 */
export async function remediatePartnerConfigurations(
	prisma: PrismaClient
): Promise<PartnerRemediationResult> {
	const partnerLevel = await prisma.level.findUnique({
		where: { code: PARTNER_EXTERNAL_LEVEL_CODE },
		select: { idLevel: true },
	})
	if (!partnerLevel) {
		throw new PartnerSeedCoverageError(
			`El nivel ${PARTNER_EXTERNAL_LEVEL_CODE} no existe; ejecuta primero el seed de referencia.`
		)
	}

	const plan = await previewMissingBaseConfigurations()
	const partnerProblems = plan.problems.filter(
		(problem) => problem.idLevel === partnerLevel.idLevel
	)
	const overridden = partnerProblems.filter(
		(problem) =>
			problem.code === REMEDIATION_PROBLEM.CODE_TOO_LONG &&
			problem.detail in PARTNER_CODE_OVERRIDES
	)
	const partnerPlan = {
		...plan,
		inserts: [
			...plan.inserts.filter(
				(insert) => insert.levelCode === PARTNER_EXTERNAL_LEVEL_CODE
			),
			// Product and company names are display-only; applying a plan only
			// reads the ids, level code and code.
			...overridden.map((problem) => ({
				idProduct: problem.idProduct,
				idLevel: problem.idLevel,
				code: PARTNER_CODE_OVERRIDES[problem.detail],
				productName: '',
				companyName: '',
				levelCode: PARTNER_EXTERNAL_LEVEL_CODE,
			})),
		],
		problems: partnerProblems.filter(
			(problem) => !overridden.includes(problem)
		),
	}

	// One transaction per batch: a single transaction over every product needs
	// ~10 round-trips each and outlives the interactive-transaction timeout when
	// the database is reached through a tunnel. The apply step is idempotent,
	// so a failed run can simply be repeated.
	let created = 0
	let skipped = 0
	for (
		let start = 0;
		start < partnerPlan.inserts.length;
		start += PARTNER_REMEDIATION_BATCH_SIZE
	) {
		const applied = await applyMissingBaseConfigurations({
			...partnerPlan,
			inserts: partnerPlan.inserts.slice(
				start,
				start + PARTNER_REMEDIATION_BATCH_SIZE
			),
		})
		created += applied.created
		skipped += applied.skipped
	}

	return { created, skipped, problems: partnerPlan.problems }
}

/**
 * Lists active products with no active PARTNER_EXTERNAL configuration that
 * carries a PPC flagged for new businesses.
 */
async function findProductsWithoutPartnerPpc(prisma: PrismaClient) {
	return prisma.product.findMany({
		where: {
			status: true,
			company: { status: true },
			productConfigurations: {
				none: {
					active: true,
					level: { code: PARTNER_EXTERNAL_LEVEL_CODE },
					idProductPercentageCommissionNewBusinesses: { not: null },
				},
			},
		},
		select: { idProduct: true, name: true },
		orderBy: { idProduct: 'asc' },
	})
}

/**
 * Full partner seed: reference data, then remediation, then the coverage gate.
 * Throws PartnerSeedCoverageError (non-zero exit in the CLI) when any active
 * product still lacks a partner PPC (e.g. CODE_TOO_LONG, design D12).
 */
export async function runPartnerSeed(prisma: PrismaClient): Promise<void> {
	await seedPartnerReferenceData(prisma)

	const result = await remediatePartnerConfigurations(prisma)
	console.log(
		`✅ Configuraciones Partner: ${result.created} creadas, ${result.skipped} omitidas.`
	)

	const problemDetails = result.problems.map(
		(problem) =>
			`product=${problem.idProduct} ${problem.code} ${problem.detail}`
	)
	const missing = await findProductsWithoutPartnerPpc(prisma)

	if (missing.length > 0 || problemDetails.length > 0) {
		const names = missing.map((p) => `${p.name} (id ${p.idProduct})`).join(', ')
		throw new PartnerSeedCoverageError(
			`Cobertura Partner incompleta. Productos sin PPC: ${names || 'ninguno'}. Problemas: ${problemDetails.join('; ') || 'ninguno'}.`
		)
	}
}
