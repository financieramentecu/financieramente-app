import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

const { mockPreview, mockApply } = vi.hoisted(() => ({
	mockPreview: vi.fn(),
	mockApply: vi.fn(),
}))

vi.mock(
	'../../../src/features/product/services/remediate-base-configurations.service',
	() => ({
		previewMissingBaseConfigurations: mockPreview,
		applyMissingBaseConfigurations: mockApply,
	})
)

import {
	PARTNER_CODE_OVERRIDES,
	PARTNER_REMEDIATION_BATCH_SIZE,
	PartnerSeedCoverageError,
	remediatePartnerConfigurations,
	runPartnerSeed,
	seedPartnerReferenceData,
} from '../partner'

type Row = { id?: number; idLevel?: number; code?: string; name?: string }

/** In-memory Prisma double covering only the calls the partner seed makes. */
function createPrisma(options?: {
	missingProducts?: Array<{ idProduct: number; name: string }>
}) {
	const roles: Row[] = []
	const levels: Row[] = [{ idLevel: 6, code: 'LEVEL_5', name: 'Partner' }]
	const categories: Row[] = []

	const prisma = {
		role: {
			upsert: vi.fn(
				async ({ where, create }: { where: { code: string }; create: Row }) => {
					if (!roles.find((r) => r.code === where.code))
						roles.push({ ...create })
					return create
				}
			),
		},
		level: {
			findUnique: vi.fn(
				async ({ where }: { where: { code: string } }) =>
					levels.find((l) => l.code === where.code) ?? null
			),
			create: vi.fn(async ({ data }: { data: Row }) => {
				levels.push({ idLevel: 100 + levels.length, ...data })
				return data
			}),
			update: vi.fn(async () => ({})),
		},
		categoryType: { findUnique: vi.fn(async () => ({ id: 3 })) },
		category: {
			findFirst: vi.fn(
				async ({ where }: { where: { name: string } }) =>
					categories.find((c) => c.name === where.name) ?? null
			),
			create: vi.fn(async ({ data }: { data: Row }) => {
				categories.push({ id: categories.length + 1, ...data })
				return data
			}),
			update: vi.fn(async () => ({})),
		},
		product: {
			findMany: vi.fn(async () => options?.missingProducts ?? []),
		},
	}
	return {
		prisma: prisma as unknown as PrismaClient,
		mocks: prisma,
		roles,
		levels,
		categories,
	}
}

const partnerInsert = {
	idProduct: 1,
	idLevel: 100,
	code: 'ACME_PROD_PARTNER_EXTERNAL',
	productName: 'Prod',
	companyName: 'Acme',
	levelCode: 'PARTNER_EXTERNAL',
}
const otherInsert = {
	...partnerInsert,
	idLevel: 2,
	code: 'ACME_PROD_LEVEL_1',
	levelCode: 'LEVEL_1',
}

describe('seedPartnerReferenceData', () => {
	it('creates role PARTNER, level PARTNER_EXTERNAL and category "Partner Externo" (MIA)', async () => {
		const { prisma, roles, levels, categories, mocks } = createPrisma()

		await seedPartnerReferenceData(prisma)

		expect(roles.map((r) => r.code)).toEqual(['PARTNER'])
		expect(levels.map((l) => l.code)).toContain('PARTNER_EXTERNAL')
		expect(categories.map((c) => c.name)).toEqual(['Partner Externo'])
		expect(mocks.categoryType.findUnique).toHaveBeenCalledWith({
			where: { name: 'MIA' },
		})
	})

	it('is idempotent: a second run adds no rows', async () => {
		const { prisma, roles, levels, categories } = createPrisma()

		await seedPartnerReferenceData(prisma)
		const counts = [roles.length, levels.length, categories.length]
		await seedPartnerReferenceData(prisma)

		expect([roles.length, levels.length, categories.length]).toEqual(counts)
	})

	it('only touches partner data: LEVEL_5 is never updated', async () => {
		const { prisma, mocks } = createPrisma()

		await seedPartnerReferenceData(prisma)

		const lookedUp = mocks.level.findUnique.mock.calls.map(
			([a]) => a.where.code
		)
		expect(lookedUp).not.toContain('LEVEL_5')
		expect(lookedUp).not.toContain('PARTNER')
		expect(mocks.level.update).not.toHaveBeenCalled()
	})
})

describe('remediatePartnerConfigurations', () => {
	beforeEach(() => {
		mockPreview.mockReset()
		mockApply.mockReset()
	})

	it('applies only the PARTNER_EXTERNAL inserts of the plan', async () => {
		mockPreview.mockResolvedValue({
			inserts: [otherInsert, partnerInsert],
			skippedExisting: 0,
			problems: [],
		})
		mockApply.mockResolvedValue({ created: 1, skipped: 0 })

		const { prisma } = createPrisma()
		await seedPartnerReferenceData(prisma)

		const result = await remediatePartnerConfigurations(prisma)

		expect(mockApply).toHaveBeenCalledWith(
			expect.objectContaining({ inserts: [partnerInsert] })
		)
		expect(result).toMatchObject({ created: 1, skipped: 0, problems: [] })
	})

	it('applies the inserts in bounded batches and sums the results', async () => {
		const total = PARTNER_REMEDIATION_BATCH_SIZE * 2 + 1
		const inserts = Array.from({ length: total }, (_, index) => ({
			...partnerInsert,
			idProduct: index + 1,
			code: `ACME_PROD_${index + 1}_PARTNER_EXTERNAL`,
		}))
		mockPreview.mockResolvedValue({
			inserts,
			skippedExisting: 0,
			problems: [],
		})
		mockApply.mockResolvedValue({ created: 1, skipped: 1 })

		const { prisma } = createPrisma()
		await seedPartnerReferenceData(prisma)

		const result = await remediatePartnerConfigurations(prisma)

		const batchSizes = mockApply.mock.calls.map(([plan]) => plan.inserts.length)
		expect(batchSizes).toEqual([
			PARTNER_REMEDIATION_BATCH_SIZE,
			PARTNER_REMEDIATION_BATCH_SIZE,
			1,
		])
		expect(result).toMatchObject({ created: 3, skipped: 3 })
	})

	it('creates the config with the manual code when a CODE_TOO_LONG product has an override', async () => {
		const [generatedCode, manualCode] = Object.entries(
			PARTNER_CODE_OVERRIDES
		)[0]
		mockPreview.mockResolvedValue({
			inserts: [],
			skippedExisting: 0,
			problems: [
				{
					idProduct: 82,
					idLevel: 100,
					code: 'CODE_TOO_LONG',
					detail: generatedCode,
				},
			],
		})
		mockApply.mockResolvedValue({ created: 1, skipped: 0 })
		const { prisma } = createPrisma()
		;(prisma.level.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
			idLevel: 100,
		})

		const result = await remediatePartnerConfigurations(prisma)

		expect(mockApply).toHaveBeenCalledWith(
			expect.objectContaining({
				inserts: [
					expect.objectContaining({
						idProduct: 82,
						idLevel: 100,
						code: manualCode,
						levelCode: 'PARTNER_EXTERNAL',
					}),
				],
			})
		)
		expect(result.problems).toEqual([])
	})

	it('keeps manual codes within the column limit and only for codes that are too long', () => {
		for (const [generatedCode, manualCode] of Object.entries(
			PARTNER_CODE_OVERRIDES
		)) {
			expect(generatedCode.length).toBeGreaterThan(50)
			expect(manualCode.length).toBeLessThanOrEqual(50)
		}
	})

	it('reports only PARTNER_EXTERNAL problems (e.g. CODE_TOO_LONG)', async () => {
		const partnerProblem = {
			idProduct: 9,
			idLevel: 100,
			code: 'CODE_TOO_LONG',
			detail: 'X'.repeat(51),
		}
		const otherProblem = {
			idProduct: 9,
			idLevel: 2,
			code: 'CODE_TOO_LONG',
			detail: 'Y',
		}
		mockPreview.mockResolvedValue({
			inserts: [],
			skippedExisting: 0,
			problems: [partnerProblem, otherProblem],
		})
		mockApply.mockResolvedValue({ created: 0, skipped: 0 })
		// problems are matched by level id through the plan inserts/levels lookup
		const { prisma } = createPrisma()
		;(prisma.level.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
			idLevel: 100,
		})

		const result = await remediatePartnerConfigurations(prisma)

		expect(result.problems).toEqual([partnerProblem])
	})
})

describe('runPartnerSeed', () => {
	beforeEach(() => {
		mockPreview.mockReset()
		mockApply.mockReset()
		mockPreview.mockResolvedValue({
			inserts: [partnerInsert],
			skippedExisting: 0,
			problems: [],
		})
		mockApply.mockResolvedValue({ created: 1, skipped: 0 })
	})

	it('seeds reference data before remediation and passes when coverage is complete', async () => {
		const { prisma, mocks } = createPrisma({ missingProducts: [] })
		const order: string[] = []
		mocks.role.upsert.mockImplementation(async () => {
			order.push('seed')
			return {}
		})
		mockApply.mockImplementation(async () => {
			order.push('remediate')
			return { created: 1, skipped: 0 }
		})

		await expect(runPartnerSeed(prisma)).resolves.toBeUndefined()
		expect(order).toEqual(['seed', 'remediate'])
	})

	it('throws PartnerSeedCoverageError when an active product has no partner PPC', async () => {
		const { prisma } = createPrisma({
			missingProducts: [{ idProduct: 7, name: 'Universal' }],
		})

		await expect(runPartnerSeed(prisma)).rejects.toBeInstanceOf(
			PartnerSeedCoverageError
		)
		await expect(runPartnerSeed(prisma)).rejects.toThrow(/Universal/)
	})

	it('throws when the plan reports a PARTNER_EXTERNAL problem even if coverage query is empty', async () => {
		mockPreview.mockResolvedValue({
			inserts: [],
			skippedExisting: 0,
			problems: [
				{
					idProduct: 9,
					idLevel: 100,
					code: 'CODE_TOO_LONG',
					detail: 'X'.repeat(51),
				},
			],
		})
		const { prisma } = createPrisma({ missingProducts: [] })
		;(prisma.level.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
			idLevel: 100,
		})

		await expect(runPartnerSeed(prisma)).rejects.toThrow(/CODE_TOO_LONG/)
	})
})
