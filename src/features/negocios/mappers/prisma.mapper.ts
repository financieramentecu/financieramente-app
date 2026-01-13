/**
 * Mapper centralizado para transformar tipos de Prisma a tipos de dominio
 * Proporciona funciones de transformación para todas las entidades de Prisma usadas en el feature
 */

import type {
	Company,
	Product,
	Currency,
	BuyPeriodicity,
	ClientOrigin,
} from '@prisma/client'
import type {
	ProductInfo,
	CurrencyInfo,
	PeriodicityInfo,
	ClientOriginInfo,
} from '../types/business-entity.types'

/**
 * Información de company transformada desde Prisma
 */
export interface CompanyInfo {
	id: number
	name: string
	type: string
	status: boolean
}

/**
 * Transforma un Company de Prisma a CompanyInfo
 *
 * @param prisma - Company de Prisma
 * @returns CompanyInfo para uso en la UI
 *
 * @example
 * ```typescript
 * const companies = await prisma.company.findMany()
 * const companyInfos = companies.map(prismaCompanyToInfo)
 * ```
 */
export function prismaCompanyToInfo(prisma: Company): CompanyInfo {
	return {
		id: prisma.idCompany,
		name: prisma.name,
		type: prisma.idTypeCompany,
		status: prisma.status,
	}
}

/**
 * Transforma una lista de Company de Prisma a CompanyInfo[]
 */
export function prismaCompanyListToInfo(prismaList: Company[]): CompanyInfo[] {
	return prismaList.map(prismaCompanyToInfo)
}

/**
 * Transforma un Product de Prisma a ProductInfo
 * Nota: Requiere que el Company esté incluido en la relación
 *
 * @param prisma - Product de Prisma con relación company
 * @returns ProductInfo para uso en la UI
 */
export function prismaProductToInfo(
	prisma: Product & { company: Company }
): ProductInfo {
	return {
		id: prisma.idProduct,
		name: prisma.name,
		companyId: prisma.company.idCompany,
		companyName: prisma.company.name,
	}
}

/**
 * Transforma un Currency de Prisma a CurrencyInfo
 *
 * @param prisma - Currency de Prisma
 * @returns CurrencyInfo para uso en la UI
 */
export function prismaCurrencyToInfo(prisma: Currency): CurrencyInfo {
	return {
		id: prisma.idCurrency,
		name: prisma.name,
	}
}

/**
 * Transforma una lista de Currency de Prisma a CurrencyInfo[]
 */
export function prismaCurrencyListToInfo(
	prismaList: Currency[]
): CurrencyInfo[] {
	return prismaList.map(prismaCurrencyToInfo)
}

/**
 * Transforma un BuyPeriodicity de Prisma a PeriodicityInfo
 *
 * @param prisma - BuyPeriodicity de Prisma
 * @returns PeriodicityInfo para uso en la UI
 */
export function prismaPeriodicityToInfo(
	prisma: BuyPeriodicity
): PeriodicityInfo {
	return {
		id: prisma.idBuyPeriodicity,
		name: prisma.name,
	}
}

/**
 * Transforma una lista de BuyPeriodicity de Prisma a PeriodicityInfo[]
 */
export function prismaPeriodicityListToInfo(
	prismaList: BuyPeriodicity[]
): PeriodicityInfo[] {
	return prismaList.map(prismaPeriodicityToInfo)
}

/**
 * Transforma un ClientOrigin de Prisma a ClientOriginInfo
 *
 * @param prisma - ClientOrigin de Prisma
 * @returns ClientOriginInfo para uso en la UI
 */
export function prismaClientOriginToInfo(
	prisma: ClientOrigin
): ClientOriginInfo {
	return {
		id: prisma.idClientOrigin,
		name: prisma.name,
	}
}

/**
 * Transforma una lista de ClientOrigin de Prisma a ClientOriginInfo[]
 */
export function prismaClientOriginListToInfo(
	prismaList: ClientOrigin[]
): ClientOriginInfo[] {
	return prismaList.map(prismaClientOriginToInfo)
}
