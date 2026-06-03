'use client'

import { useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { Filter } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/features/shared/ui/button'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/features/shared/ui/sheet'
import { Label } from '@/features/shared/ui/label'
import { RadioGroup, RadioGroupItem } from '@/features/shared/ui/radio-group'
import { Badge } from '@/features/shared/ui/badge'
import { DateRangePicker } from '@/features/shared/ui/date-range-picker'
import { MultiSelect } from '@/features/shared/ui/multi-select'
import { useCompanies } from '@/features/company/hooks/use-companies'
import { useProducts } from '@/features/product/hooks/use-products'
import { useClientOrigins } from '@/features/origins/hooks/use-client-origins'
import { usePeriodicities } from '@/features/negocios/hooks/use-periodicities'
import { useBusinessTerms } from '@/features/negocios/hooks/use-business-terms'
import { useAgentCategories } from '@/features/negocios/hooks/use-agent-categories'
import { useMoneyStrategists } from '@/features/negocios/hooks/use-money-strategists'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import { countActiveDimensions } from '@/features/negocios/lib/count-active-dimensions'

const DATE_FIELDS = [
	{ value: 'fondeo', label: 'Fondeo', fromParam: 'dateFrom', toParam: 'dateTo' },
	{ value: 'creacion', label: 'Creación', fromParam: 'createdFrom', toParam: 'createdTo' },
	{ value: 'emision', label: 'Emisión', fromParam: 'dateIssuedFrom', toParam: 'dateIssuedTo' },
] as const

type DateFieldValue = (typeof DATE_FIELDS)[number]['value']

const STATUS_OPTIONS = [
	{ value: BUSINESS_STATUS.VENTA_EFECTUADA, label: 'Venta efectuada' },
	{ value: BUSINESS_STATUS.EMITIDO, label: 'Emitido' },
	{ value: BUSINESS_STATUS.LIQUIDADO, label: 'Liquidado' },
	{ value: BUSINESS_STATUS.CANCELADO, label: 'Cancelado' },
	{ value: BUSINESS_STATUS.FONDEADO, label: 'Fondeado' },
]

interface FilterFormValues {
	dateField: DateFieldValue
	dateRange: DateRange | undefined
	statuses: string[]
	hasSupports: 'all' | 'true' | 'false'
	companyIds: string[]
	productIds: string[]
	originIds: string[]
	terms: string[]
	periodicityIds: string[]
	agentCategoryIds: string[]
	agentIds: string[]
	agentName: string
}

function getDefaultValues(searchParams: URLSearchParams): FilterFormValues {
	const dateFrom = searchParams.get('dateFrom')
	const dateTo = searchParams.get('dateTo')
	const createdFrom = searchParams.get('createdFrom')
	const createdTo = searchParams.get('createdTo')
	const dateIssuedFrom = searchParams.get('dateIssuedFrom')
	const dateIssuedTo = searchParams.get('dateIssuedTo')

	let dateField: DateFieldValue = 'fondeo'
	let dateRange: DateRange | undefined = undefined

	if (dateIssuedFrom && dateIssuedTo) {
		dateField = 'emision'
		dateRange = {
			from: new Date(`${dateIssuedFrom}T12:00:00`),
			to: new Date(`${dateIssuedTo}T12:00:00`),
		}
	} else if (createdFrom && createdTo) {
		dateField = 'creacion'
		dateRange = {
			from: new Date(`${createdFrom}T12:00:00`),
			to: new Date(`${createdTo}T12:00:00`),
		}
	} else if (dateFrom && dateTo) {
		dateField = 'fondeo'
		dateRange = {
			from: new Date(`${dateFrom}T12:00:00`),
			to: new Date(`${dateTo}T12:00:00`),
		}
	}

	const hasSupportsParam = searchParams.get('hasSupports')
	const hasSupports =
		hasSupportsParam === 'true' ? 'true' : hasSupportsParam === 'false' ? 'false' : 'all'

	return {
		dateField,
		dateRange,
		statuses: searchParams.getAll('statuses'),
		hasSupports: hasSupports as 'all' | 'true' | 'false',
		companyIds: searchParams.getAll('companyIds'),
		productIds: searchParams.getAll('productIds'),
		originIds: searchParams.getAll('originIds'),
		terms: searchParams.getAll('terms'),
		periodicityIds: searchParams.getAll('periodicityIds'),
		agentCategoryIds: searchParams.getAll('agentCategoryIds'),
		agentIds: searchParams.getAll('agentIds'),
		agentName: searchParams.get('agentName') ?? '',
	}
}

function toDateStr(date: Date): string {
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

/**
 * AdvancedFiltersSheet — side="right" Sheet with RHF draft state.
 * "Aplicar" commits to URL; dismissing without apply leaves URL unchanged.
 */
export function AdvancedFiltersSheet() {
	const router = useRouter()
	const searchParams = useSearchParams()

	const [open, setOpen] = useState(false)
	const defaultValues = getDefaultValues(searchParams)
	const activeDimensions = countActiveDimensions(searchParams)

	const { control, handleSubmit, reset, watch, setValue } = useForm<FilterFormValues>({
		defaultValues,
	})

	// Load catalogs
	const { state: companiesState } = useCompanies({ pageSize: 100 })
	const { state: productsState } = useProducts({ pageSize: 100 })
	const { state: originsState } = useClientOrigins({ pageSize: 100 })
	const periodicitiesState = usePeriodicities()
	const termsState = useBusinessTerms()
	const agentCategoriesState = useAgentCategories()
	const moneyStrategistsState = useMoneyStrategists()

	const companyOptions =
		companiesState.status === 'success'
			? companiesState.data.companies.map((c) => ({
				value: String(c.idCompany),
				label: c.name,
			}))
			: []

	// Cascade: filter products by selected companies
	const selectedCompanyIds = watch('companyIds')
	const allProducts =
		productsState.status === 'success' ? productsState.data.products : []

	const productOptions =
		selectedCompanyIds.length > 0
			? allProducts
				.filter((p) => selectedCompanyIds.includes(String(p.idCompany)))
				.map((p) => ({ value: String(p.idProduct), label: p.name }))
			: allProducts.map((p) => ({ value: String(p.idProduct), label: p.name }))

	const originOptions =
		originsState.status === 'success'
			? originsState.data.origins.map((o) => ({
				value: String(o.idClientOrigin),
				label: o.name,
			}))
			: []

	const periodicityOptions =
		periodicitiesState.status === 'success'
			? periodicitiesState.data.map((p) => ({
				value: String(p.id),
				label: p.name,
			}))
			: []

	const moneyStrategistOptions =
		moneyStrategistsState.status === 'success'
			? moneyStrategistsState.data.map((u) => ({ value: String(u.id), label: u.name }))
			: []

	const agentCategoryOptions =
		agentCategoriesState.status === 'success'
			? agentCategoriesState.data.map((c) => ({
				value: String(c.id),
				label: c.name,
			}))
			: []

	const termOptions =
		termsState.status === 'success'
			? termsState.data.map((t) => ({
				value: String(t),
				label: `${t} año${t === 1 ? '' : 's'}`,
			}))
			: []

	const onApply = useCallback(
		(values: FilterFormValues) => {
			// Build new search params from form values
			const params = new URLSearchParams(searchParams.toString())

			// Clear all filter params first
			const filterKeys = [
				'statuses', 'dateFrom', 'dateTo', 'createdFrom', 'createdTo',
				'dateIssuedFrom', 'dateIssuedTo', 'hasSupports', 'agentName', 'agentCategoryIds', 'agentIds',
				'companyIds', 'productIds', 'originIds', 'terms', 'periodicityIds',
			]
			filterKeys.forEach((k) => params.delete(k))

			// Set statuses
			values.statuses.forEach((s) => params.append('statuses', s))

			// Set date range
			if (values.dateRange?.from && values.dateRange?.to) {
				const field = DATE_FIELDS.find((f) => f.value === values.dateField)
				if (field) {
					params.set(field.fromParam, toDateStr(values.dateRange.from))
					params.set(field.toParam, toDateStr(values.dateRange.to))
				}
			}

			// hasSupports
			if (values.hasSupports !== 'all') {
				params.set('hasSupports', values.hasSupports)
			}

			// agentName
			if (values.agentName.trim()) {
				params.set('agentName', values.agentName.trim())
			}

			// Array catalog filters
			values.companyIds.forEach((id) => params.append('companyIds', id))
			values.productIds.forEach((id) => params.append('productIds', id))
			values.originIds.forEach((id) => params.append('originIds', id))
			values.terms.forEach((t) => params.append('terms', t))
			values.periodicityIds.forEach((id) => params.append('periodicityIds', id))
			values.agentCategoryIds.forEach((id) => params.append('agentCategoryIds', id))
			values.agentIds.forEach((id) => params.append('agentIds', id))

			// Reset to page 1 when filters change
			params.set('page', '1')

			router.replace(`?${params.toString()}`, { scroll: false })
			setOpen(false)
		},
		[router, searchParams]
	)

	const onClear = useCallback(() => {
		reset({
			dateField: 'fondeo',
			dateRange: undefined,
			statuses: [],
			hasSupports: 'all',
			companyIds: [],
			productIds: [],
			originIds: [],
			terms: [],
			periodicityIds: [],
			agentCategoryIds: [],
			agentIds: [],
			agentName: '',
		})
	}, [reset])

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="outline" className="relative cursor-pointer gap-2">
					<Filter className="h-4 w-4" />
					Filtros avanzados
					{activeDimensions > 0 && (
						<Badge
							data-testid="filter-badge"
							className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
							style={{ backgroundColor: '#F59E0B', color: '#fff' }}
						>
							{activeDimensions}
						</Badge>
					)}
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
				<SheetHeader className="px-6 py-4 border-b">
					<SheetTitle>Filtros avanzados</SheetTitle>
				</SheetHeader>

				<form
					onSubmit={handleSubmit(onApply)}
					className="flex flex-1 flex-col overflow-hidden"
				>
					<div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
						{/* Date range section */}
						<section className="space-y-3">
							<Label className="text-sm font-semibold">Fecha</Label>
							<Controller
								control={control}
								name="dateField"
								render={({ field }) => (
									<div className="flex gap-2">
										{DATE_FIELDS.map((f) => (
											<Button
												key={f.value}
												type="button"
												variant={field.value === f.value ? 'default' : 'outline'}
												size="sm"
												onClick={() => {
													field.onChange(f.value)
													setValue('dateRange', undefined)
												}}
											>
												{f.label}
											</Button>
										))}
									</div>
								)}
							/>
							<Controller
								control={control}
								name="dateRange"
								render={({ field }) => (
									<DateRangePicker
										value={field.value}
										onChange={field.onChange}
										placeholder="Seleccionar rango de fechas"
									/>
								)}
							/>
						</section>

						{/* Money Strategist multiselect */}
						<section className="space-y-2">
							<Label className="text-sm font-semibold">Money Strategist</Label>
							<Controller
								control={control}
								name="agentIds"
								render={({ field }) => (
									<MultiSelect
										options={moneyStrategistOptions}
										value={field.value}
										onChange={field.onChange}
										placeholder="Todos los money strategists"
									/>
								)}
							/>
						</section>

						{/* Status multiselect */}
						<section className="space-y-2">
							<Label className="text-sm font-semibold">Estado</Label>
							<Controller
								control={control}
								name="statuses"
								render={({ field }) => (
									<MultiSelect
										options={STATUS_OPTIONS}
										value={field.value}
										onChange={field.onChange}
										placeholder="Todos los estados"
									/>
								)}
							/>
						</section>

						{/* Agent category multiselect */}
						<section className="space-y-2">
							<Label className="text-sm font-semibold">Categoría del Money Strategist</Label>
							<Controller
								control={control}
								name="agentCategoryIds"
								render={({ field }) => (
									<MultiSelect
										options={agentCategoryOptions}
										value={field.value}
										onChange={field.onChange}
										placeholder="Todas las categorías"
									/>
								)}
							/>
						</section>

						{/* hasSupports radio */}
						<section className="space-y-2">
							<Label className="text-sm font-semibold">Soportes</Label>
							<Controller
								control={control}
								name="hasSupports"
								render={({ field }) => (
									<RadioGroup
										value={field.value}
										onValueChange={field.onChange}
										className="flex flex-row gap-4"
									>
										<div className="flex items-center gap-1.5">
											<RadioGroupItem value="all" id="hs-all" />
											<Label htmlFor="hs-all" className="cursor-pointer font-normal">Todos</Label>
										</div>
										<div className="flex items-center gap-1.5">
											<RadioGroupItem value="true" id="hs-yes" />
											<Label htmlFor="hs-yes" className="cursor-pointer font-normal">Con</Label>
										</div>
										<div className="flex items-center gap-1.5">
											<RadioGroupItem value="false" id="hs-no" />
											<Label htmlFor="hs-no" className="cursor-pointer font-normal">Sin</Label>
										</div>
									</RadioGroup>
								)}
							/>
						</section>

						{/* Company multiselect */}
						<section className="space-y-2">
							<Label className="text-sm font-semibold">Compañía</Label>
							<Controller
								control={control}
								name="companyIds"
								render={({ field }) => (
									<MultiSelect
										options={companyOptions}
										value={field.value}
										onChange={(newCompanyIds) => {
											field.onChange(newCompanyIds)
											// Remove products that no longer belong to selected companies
											if (newCompanyIds.length > 0) {
												const validProductIds = allProducts
													.filter((p) => newCompanyIds.includes(String(p.idCompany)))
													.map((p) => String(p.idProduct))
												const currentProductIds = watch('productIds')
												const stillValid = currentProductIds.filter((id) => validProductIds.includes(id))
												if (stillValid.length !== currentProductIds.length) {
													setValue('productIds', stillValid)
												}
											}
										}}
										placeholder="Todas las compañías"
									/>
								)}
							/>
						</section>

						{/* Product multiselect */}
						<section className="space-y-2">
							<Label className="text-sm font-semibold">Producto</Label>
							<Controller
								control={control}
								name="productIds"
								render={({ field }) => (
									<MultiSelect
										options={productOptions}
										value={field.value}
										onChange={field.onChange}
										placeholder="Todos los productos"
									/>
								)}
							/>
						</section>

						{/* Origin multiselect */}
						<section className="space-y-2">
							<Label className="text-sm font-semibold">Origen</Label>
							<Controller
								control={control}
								name="originIds"
								render={({ field }) => (
									<MultiSelect
										options={originOptions}
										value={field.value}
										onChange={field.onChange}
										placeholder="Todos los orígenes"
									/>
								)}
							/>
						</section>

						{/* Terms multiselect */}
						<section className="space-y-2">
							<Label className="text-sm font-semibold">Plazo (años)</Label>
							<Controller
								control={control}
								name="terms"
								render={({ field }) => (
									<MultiSelect
										options={termOptions}
										value={field.value}
										onChange={field.onChange}
										placeholder="Todos los plazos"
									/>
								)}
							/>
						</section>

						{/* Periodicity multiselect */}
						<section className="space-y-2">
							<Label className="text-sm font-semibold">Periodicidad</Label>
							<Controller
								control={control}
								name="periodicityIds"
								render={({ field }) => (
									<MultiSelect
										options={periodicityOptions}
										value={field.value}
										onChange={field.onChange}
										placeholder="Todas las periodicidades"
									/>
								)}
							/>
						</section>

					</div>

					<div className="flex items-center justify-between gap-3 border-t px-6 py-4">
						<Button type="button" variant="ghost" onClick={onClear}>
							Limpiar filtros
						</Button>
						<Button type="submit">
							Aplicar
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	)
}
