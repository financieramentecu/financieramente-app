/**
 * Tipos para componentes UI compartidos del dashboard
 */

export interface DataTableColumn<T> {
	key: keyof T
	header: string
	cellRenderer?: (value: unknown, row: T) => React.ReactNode
	sortable?: boolean
}

export interface DataTableProps<T> {
	columns: DataTableColumn<T>[]
	data: T[]
	pagination?: {
		currentPage: number
		pageSize: number
		totalItems: number
		onPageChange: (page: number) => void
	}
	onRowAction?: (row: T, action: string) => void
	searchable?: boolean
	onGlobalSearch?: (query: string) => void
	loading?: boolean
	searchPlaceholder?: string
	/** Render prop opcional para agregar filtros adicionales al lado del search */
	renderAdditionalFilters?: () => React.ReactNode
}

/**
 * Información de currency para selector
 */
export interface CurrencyOption {
	symbol: string
	name: string
}

export interface StatsCardProps {
	title: string
	value: string | number
	change?: number
	trend?: 'up' | 'down' | 'neutral'
	icon?: React.ReactNode
	description?: string
	monthlyData?: number[]
	/** Lista de currencies disponibles para el selector */
	currencies?: CurrencyOption[]
	/** Currency seleccionada actualmente */
	selectedCurrency?: string
	/** Callback cuando el usuario cambia de currency */
	onCurrencyChange?: (currency: string) => void
}
