import { useMemo } from 'react'
import { Company } from '@prisma/client'
import { Product } from '@prisma/client'
import { BuyPeriodicity } from '@prisma/client'
import { Currency } from '@prisma/client'
import { ClientOrigin } from '@prisma/client'

export const useGetAllData = ({
	companies,
	products,
	periodicities,
	currencies,
	clientOrigins,
}: {
	companies: Company[]
	products: Product[]
	periodicities: BuyPeriodicity[]
	currencies: Currency[]
	clientOrigins: ClientOrigin[]
}) => {
	const companiesOptions = useMemo(
		() =>
			companies.map((company) => ({
				value: company.idCompany.toString(),
				label: company.name,
			})),
		[companies]
	)

	const productsOptions = useMemo(
		() =>
			products.map((product) => ({
				value: product.idProduct.toString(),
				label: product.name,
				companyId: product.idCompany.toString(),
			})),
		[products]
	)

	const periodicitiesOptions = useMemo(
		() =>
			periodicities.map((periodicity) => ({
				value: periodicity.idBuyPeriodicity.toString(),
				label: periodicity.name,
			})),
		[periodicities]
	)

	const currenciesOptions = useMemo(
		() =>
			currencies.map((currency) => ({
				value: currency.idCurrency.toString(),
				label: currency.name,
			})),
		[currencies]
	)

	const clientOriginsOptions = useMemo(
		() =>
			clientOrigins.map((clientOrigin) => ({
				value: clientOrigin.idClientOrigin.toString(),
				label: clientOrigin.name,
			})),
		[clientOrigins]
	)

	return {
		companiesOptions,
		productsOptions,
		periodicitiesOptions,
		currenciesOptions,
		clientOriginsOptions,
	}
}
