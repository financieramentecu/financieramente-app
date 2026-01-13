import * as React from 'react'
import { UseFormSetValue } from 'react-hook-form'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

interface UseProductFilterOptions {
	productsOptions: { value: string; label: string; companyId: string }[]
	selectedCompany: string
	selectedProduct: string
	setValue: UseFormSetValue<BusinessFormData>
}

/**
 * Hook para filtrar productos basado en la company seleccionada
 * y resetear el producto cuando la company cambia
 */
export function useProductFilter({
	productsOptions,
	selectedCompany,
	selectedProduct,
	setValue,
}: UseProductFilterOptions) {
	// Filtrar productos basado en company seleccionada
	const filteredProducts = React.useMemo(() => {
		if (!selectedCompany) {
			return productsOptions
		}
		return productsOptions.filter(
			(product) => product.companyId === selectedCompany
		)
	}, [productsOptions, selectedCompany])

	// Validar que el producto seleccionado sigue siendo válido
	React.useEffect(() => {
		if (
			selectedProduct &&
			!filteredProducts.some((product) => product.value === selectedProduct)
		) {
			setValue('producto', '', { shouldValidate: true })
		}
	}, [filteredProducts, selectedProduct, setValue])

	return {
		filteredProducts,
	}
}
