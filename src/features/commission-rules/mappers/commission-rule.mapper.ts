import {
	type ProductPercentageCommission,
	type ProductPercentageCommissionCategory,
	type Category,
} from '@prisma/client'
import {
	type CommissionRule,
	type CommissionRuleCategory,
} from '../types/commission-rule.types'

export type PrismaCommissionRule = ProductPercentageCommission & {
	productPercentageCommissionCategories?: (ProductPercentageCommissionCategory & {
		category?: Category
	})[]
}

export class CommissionRuleMapper {
	static toDomain(prismaRule: PrismaCommissionRule): CommissionRule {
		const { productPercentageCommissionCategories, ...rest } = prismaRule

		const domainRule: CommissionRule = {
			...rest,
			categories: productPercentageCommissionCategories?.map((cat) => ({
				...cat,
				// Map nested category if present
				category: cat.category,
			})) as CommissionRuleCategory[],
		}

		return domainRule
	}
}
