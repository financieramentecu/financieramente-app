/**
 * Fixtures para opciones de formulario
 * Simula los datos de selectores del formulario de negocio
 */

export interface SelectOption {
	value: string
	label: string
}

export interface ProductOption extends SelectOption {
	companyId: string
}

/**
 * Opciones mock de companies
 */
export const mockCompaniesOptions: SelectOption[] = [
	{ value: '1', label: 'Skandia' },
	{ value: '2', label: 'Trinity' },
	{ value: '3', label: 'American Fidelity' },
]

/**
 * Opciones mock de productos
 */
export const mockProductsOptions: ProductOption[] = [
	{ value: '1', label: 'Crédito Personal', companyId: '1' },
	{ value: '2', label: 'Crédito Hipotecario', companyId: '1' },
	{ value: '3', label: 'Crédito Vehicular', companyId: '2' },
	{ value: '4', label: 'Seguro de Vida', companyId: '2' },
	{ value: '5', label: 'Fondo de Inversión', companyId: '3' },
]

/**
 * Opciones mock de periodicidades
 */
export const mockPeriodicitiesOptions: SelectOption[] = [
	{ value: '1', label: 'Mensual' },
	{ value: '2', label: 'Trimestral' },
	{ value: '3', label: 'Semestral' },
	{ value: '4', label: 'Anual' },
]

/**
 * Opciones mock de monedas
 */
export const mockCurrenciesOptions: SelectOption[] = [
	{ value: '1', label: 'COP' },
	{ value: '2', label: 'USD' },
]

/**
 * Opciones mock de origen de cliente
 */
export const mockClientOriginsOptions: SelectOption[] = [
	{ value: '1', label: 'Referido' },
	{ value: '2', label: 'Propio' },
	{ value: '3', label: 'Aliado' },
]

/**
 * Objeto con todas las opciones del formulario
 */
export const mockFormOptions = {
	companiesOptions: mockCompaniesOptions,
	productsOptions: mockProductsOptions,
	periodicitiesOptions: mockPeriodicitiesOptions,
	currenciesOptions: mockCurrenciesOptions,
	clientOriginsOptions: mockClientOriginsOptions,
}

/**
 * Tipo para las opciones del formulario
 */
export type FormSelectOptions = typeof mockFormOptions
