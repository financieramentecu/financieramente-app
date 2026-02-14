import { describe, it, expect } from 'vitest'
import {
	CommissionRuleMapper,
	type PrismaCommissionRule,
} from '../../mappers/commission-rule.mapper'
import { mockCommissionRule } from '../fixtures/mock-commission-rule'
import { Decimal } from '@prisma/client/runtime/library'

describe('CommissionRuleMapper', () => {
	it('should map Prisma result to Domain entity correctly', () => {
		// We construct a "Prisma-like" object based on our mock
		// The mapper expects the categories to be under 'productPercentageCommissionCategories'
		const prismaResult = {
			...mockCommissionRule,
			productPercentageCommissionCategories: mockCommissionRule.categories,
		}

		// We can delete 'categories' to simulate raw prisma output if we were strict,
		// but the mapper ignores extra fields so it's fine.

		const domain = CommissionRuleMapper.toDomain(
			prismaResult as unknown as PrismaCommissionRule
		)

		expect(domain.idProductPercentageCommission).toBe(
			mockCommissionRule.idProductPercentageCommission
		)
		expect(domain.categories).toBeDefined()
		expect(domain.categories?.length).toBe(1)
		expect(domain.categories?.[0].porcentajeDistribucion).toBeInstanceOf(
			Decimal
		)
		expect(domain.categories?.[0].category).toBeDefined()
	})

	it('should handle missing categories gracefully', () => {
		const prismaResult = {
			idProductPercentageCommission: 1,
			idProductConfiguration: 1,
			description: 'Test',
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			productPercentageCommissionCategories: undefined,
		}

		const domain = CommissionRuleMapper.toDomain(
			prismaResult as unknown as PrismaCommissionRule
		)
		expect(domain.categories).toBeUndefined()
	})
})
