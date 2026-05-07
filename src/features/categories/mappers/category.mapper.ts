import { Category, CategoryType, User } from '@prisma/client'
import { Category as CategoryDomain } from '../types/category.types'

export type PrismaCategoryWithRelations = Category & {
	categoryType?: CategoryType | null
	fixedBeneficiaryUser?: Pick<User, 'idUser' | 'name' | 'lastName' | 'email'> | null
	beneficiaryMode?: string | null
	idFixedBeneficiaryUser?: number | null
	nextCategory?: {
		idCategory: number
		name: string
		[key: string]: unknown
	} | null
}

/**
 * Mapea una categoría de Prisma a una categoría de dominio
 */
export const prismaCategoryToCategory = (
	prisma: PrismaCategoryWithRelations
): CategoryDomain => {
	// Use type-safe approach to get type name, fallback to legacy field then default
	const typeCategory = prisma.categoryType?.name || (prisma as unknown as { typeCategory: string }).typeCategory || 'MMS'

	const fixedBeneficiaryUser = prisma.fixedBeneficiaryUser
		? {
				idUser: prisma.fixedBeneficiaryUser.idUser,
				name: prisma.fixedBeneficiaryUser.name,
				lastName: prisma.fixedBeneficiaryUser.lastName ?? '',
				email: prisma.fixedBeneficiaryUser.email,
			}
		: null

	const nextCategory = prisma.nextCategory
		? {
				id: prisma.nextCategory.idCategory,
				name: prisma.nextCategory.name,
			}
		: null

	const beneficiaryMode = (prisma.beneficiaryMode as string) === 'BENEFICIARIO_GENERAL'
		? 'BENEFICIARIO_GENERAL' as const
		: 'OVERRIDE' as const

	return {
		idCategory: prisma.idCategory,
		code: prisma.code,
		name: prisma.name,
		typeCategory,
		idCategoryType: prisma.idCategoryType || 1,
		descripcion: prisma.descripcion === null ? null : (prisma.descripcion || ''),
		color: prisma.color,
		status: prisma.status,
		beneficiaryMode,
		idFixedBeneficiaryUser: prisma.idFixedBeneficiaryUser ?? null,
		fixedBeneficiaryUser,
		idNextCategory: prisma.idNextCategory ?? null,
		nextCategory,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	}
}

/**
 * Mapea una lista de categorías de Prisma a categorías de dominio
 */
export const prismaCategoryListToCategories = (
	prismaList: PrismaCategoryWithRelations[]
): CategoryDomain[] => {
	return prismaList.map(prismaCategoryToCategory)
}

/**
 * Backwards compatibility alias
 */
export const mapToDomain = prismaCategoryToCategory
