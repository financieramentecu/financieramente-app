import { useState, useCallback, useEffect } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import {
	createProductConfigurationSchema,
	type CreateProductConfigurationFormData,
} from '../lib/product-configuration-schemas'
import type { ProductConfiguration } from '../types/product-configuration.types'

// Option types for the form
export interface CompanyOption {
	idCompany: number
	name: string
}

export interface ProductOption {
	idProduct: number
	name: string
	idCompany: number
}

export interface ClientOriginOption {
	idClientOrigin: number
	name: string
}

export interface CategoryOption {
	idCategory: number
	name: string
}

export interface PpcOption {
	idProductPercentageCommission: number
	description?: string | null
	active: boolean
}

// Helper to create initial idle state
const initialAsyncState = <T>(): AsyncState<T> => ({
	status: 'idle',
	data: undefined,
	error: '',
})

interface UseProductConfigurationFormProps {
	mode: 'create' | 'edit'
	initialData?: ProductConfiguration
}

interface UseProductConfigurationFormReturn {
	form: UseFormReturn<CreateProductConfigurationFormData>
	companiesState: AsyncState<CompanyOption[]>
	productsState: AsyncState<ProductOption[]>
	clientOriginsState: AsyncState<ClientOriginOption[]>
	categoriesState: AsyncState<CategoryOption[]>
	ppcOptions: PpcOption[]
	selectedPpc: string
	setSelectedPpc: (value: string) => void
}

export function useProductConfigurationForm({
	mode,
	initialData,
}: UseProductConfigurationFormProps): UseProductConfigurationFormReturn {
	// Form initialization
	const form = useForm<CreateProductConfigurationFormData>({
		resolver:
			mode === 'create'
				? zodResolver(createProductConfigurationSchema)
				: undefined,
		defaultValues: {
			idCompany: initialData?.product.company.idCompany ?? 0,
			idProduct: initialData?.idProduct ?? 0,
			idClientOrigin: initialData?.idClientOrigin ?? 0,
			idCategory: initialData?.idCategory ?? 0,
		},
	})

	const { watch } = form
	const selectedCompanyId = watch('idCompany')

	// States for Data Fetching
	const [companiesState, setCompaniesState] =
		useState<AsyncState<CompanyOption[]>>(initialAsyncState())
	const [productsState, setProductsState] =
		useState<AsyncState<ProductOption[]>>(initialAsyncState())
	const [clientOriginsState, setClientOriginsState] =
		useState<AsyncState<ClientOriginOption[]>>(initialAsyncState())
	const [categoriesState, setCategoriesState] =
		useState<AsyncState<CategoryOption[]>>(initialAsyncState())

	// PPC State for Edit Mode
	const [selectedPpc, setSelectedPpc] = useState<string>(
		initialData?.idProductPercentageCommissionNewBusinesses?.toString() ?? ''
	)
	const [ppcOptions, setPpcOptions] = useState<PpcOption[]>([])

	// Fetch Companies (Endpoint: /api/admin/companies)
	const fetchCompanies = useCallback(async () => {
		setCompaniesState((prev) => ({
			...prev,
			status: 'loading',
			data: undefined,
			error: '',
		}))
		try {
			const response = await fetch('/api/admin/companies?status=active')
			const result = await response.json()
			if (result.data?.companies) {
				setCompaniesState({
					status: 'success',
					data: result.data.companies,
					error: '',
				})
			} else {
				throw new Error('No se pudieron cargar las compañías')
			}
		} catch (error) {
			setCompaniesState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error ? error.message : 'Error al cargar compañías',
			})
		}
	}, [])

	// Fetch Products (dependant on Company)
	const fetchProducts = useCallback(async (companyId: number) => {
		if (!companyId) {
			setProductsState({ status: 'success', data: [], error: '' })
			return
		}

		setProductsState((prev) => ({
			...prev,
			status: 'loading',
			data: undefined,
			error: '',
		}))
		try {
			const response = await fetch(
				`/api/products?idCompany=${companyId}&status=active`
			)
			const result = await response.json()
			if (result.data?.products) {
				setProductsState({
					status: 'success',
					data: result.data.products,
					error: '',
				})
			} else {
				throw new Error('No se pudieron cargar los productos')
			}
		} catch (error) {
			setProductsState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error ? error.message : 'Error al cargar productos',
			})
		}
	}, [])

	// Fetch Client Origins (Endpoint: /api/origins)
	const fetchClientOrigins = useCallback(async () => {
		setClientOriginsState((prev) => ({
			...prev,
			status: 'loading',
			data: undefined,
			error: '',
		}))
		try {
			const response = await fetch('/api/origins?status=active')
			const result = await response.json()
			// Note: Endpoint returns 'origins'
			if (result.data?.origins) {
				setClientOriginsState({
					status: 'success',
					data: result.data.origins,
					error: '',
				})
			} else {
				throw new Error('No se pudieron cargar los orígenes de cliente')
			}
		} catch (error) {
			setClientOriginsState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error ? error.message : 'Error al cargar orígenes',
			})
		}
	}, [])

	// Fetch Categories (Endpoint: /api/categories)
	const fetchCategories = useCallback(async () => {
		setCategoriesState((prev) => ({
			...prev,
			status: 'loading',
			data: undefined,
			error: '',
		}))
		try {
			const response = await fetch('/api/categories?status=active')
			const result = await response.json()
			if (result.data?.categories) {
				setCategoriesState({
					status: 'success',
					data: result.data.categories,
					error: '',
				})
			} else {
				throw new Error('No se pudieron cargar las categorías')
			}
		} catch (error) {
			setCategoriesState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error ? error.message : 'Error al cargar categorías',
			})
		}
	}, [])

	// Fetch PPC Options (Edit Mode)
	const fetchPpcOptions = useCallback(async (configId: number) => {
		try {
			const response = await fetch(
				`/api/product-configurations/${configId}/ppcs`
			)
			const result = await response.json()
			if (result.data) {
				setPpcOptions(result.data)
			}
		} catch (error) {
			console.error('Error fetching PPC options:', error)
			// Fallback handled by parent or empty list
		}
	}, [])

	// Effects to load initial data
	useEffect(() => {
		if (mode === 'create') {
			fetchCompanies()
			fetchClientOrigins()
			fetchCategories()
		} else if (mode === 'edit' && initialData) {
			fetchPpcOptions(initialData.id)
			// Ensure current PPC is in options if fetch fails or for initial render (optimistic)
			if (initialData.ppcNewBusinesses) {
				setPpcOptions((prev) => {
					// Avoid duplicates logic strictly if needed, but simple append works for now as initial state
					const exists = prev.some(
						(p) =>
							p.idProductPercentageCommission ===
							initialData.ppcNewBusinesses!.id
					)
					if (!exists && initialData.ppcNewBusinesses) {
						return [
							...prev,
							{
								idProductPercentageCommission: initialData.ppcNewBusinesses.id,
								description: initialData.ppcNewBusinesses.description,
								active: initialData.ppcNewBusinesses.active,
							},
						]
					}
					return prev
				})
			}
		}
	}, [
		mode,
		initialData,
		fetchCompanies,
		fetchClientOrigins,
		fetchCategories,
		fetchPpcOptions,
	])

	// Effect: When Company changes, fetch Products
	useEffect(() => {
		if (selectedCompanyId) {
			fetchProducts(selectedCompanyId)
		} else {
			setProductsState({ status: 'success', data: [], error: '' })
		}
	}, [selectedCompanyId, fetchProducts])

	return {
		form,
		companiesState,
		productsState,
		clientOriginsState,
		categoriesState,
		ppcOptions,
		selectedPpc,
		setSelectedPpc,
	}
}
