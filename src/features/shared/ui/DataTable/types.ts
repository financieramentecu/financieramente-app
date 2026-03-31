import { ColumnDef, OnChangeFn, Row, RowSelectionState } from '@tanstack/react-table'
import { ReactNode } from 'react'

export interface DataTableProps<TData> {
	/**
	 * Definición de las columnas de la tabla
	 */
	columns: ColumnDef<TData>[]
	/**
	 * Datos a mostrar en la tabla
	 */
	data: TData[]
	/**
	 * Habilita la búsqueda global (Toolbar)
	 */
	searchable?: boolean
	/**
	 * Columna por defecto para buscar si es búsqueda simple
	 */
	searchColumn?: string
	/**
	 * Tiempo de debounce para la búsqueda (ms)
	 * @default 300
	 */
	searchDebounceMs?: number
	/**
	 * Habilita la exportación a Excel
	 */
	exportable?: boolean
	/**
	 * Configuración avanzada para la exportación a Excel
	 */
	exportConfig?: {
		fileName: string
		sheetName?: string
		transformData?: (data: TData[]) => unknown[]
	}
	/**
	 * Habilita la selección de filas
	 */
	selectable?: boolean
	/**
	 * Habilita la paginación
	 */
	paginable?: boolean
	/**
	 * Estado de la selección de filas (Controlado externamente)
	 */
	rowSelection?: RowSelectionState
	/**
	 * Callback cuando cambia la selección (Controlado externamente)
	 */
	onRowSelectionChange?: OnChangeFn<RowSelectionState>
	/**
	 * Callback cuando cambia la selección (Simplificado)
	 */
	onSelectionChange?: (selectedRows: TData[]) => void
	/**
	 * Función para renderizar acciones de fila
	 */
	actions?: (row: TData) => ReactNode
	/**
	 * Callback cuando se hace click en una fila
	 */
	onRowClick?: (row: TData) => void
	/**
	 * Indica si los datos están cargando
	 */
	loading?: boolean
	/**
	 * Mensaje cuando no hay datos
	 * @default "No se encontraron resultados"
	 */
	emptyMessage?: string
	/**
	 * Opciones de tamaño de página
	 * @default [10, 20, 50, 100]
	 */
	pageSizeOptions?: number[]
	/**
	 * Tamaño de página por defecto
	 * @default 10
	 */
	defaultPageSize?: number
	/**
	 * Clase CSS adicional para el contenedor
	 */
	className?: string
	/**
	 * Habilita la persistencia en URL (opcional)
	 */
	syncWithURL?: boolean
	/**
	 * Callback para búsqueda global externa
	 */
	onGlobalSearch?: (query: string) => void
	/**
	 * Placeholder personalizado para el campo de búsqueda
	 */
	searchPlaceholder?: string
	/**
	 * Habilita la paginación manual (desde el servidor)
	 */
	manualPagination?: boolean
	/**
	 * Total de elementos (requerido para manualPagination)
	 */
	totalItems?: number
	/**
	 * Página actual (requerido para manualPagination)
	 */
	currentPage?: number
	/**
	 * Tamaño de página (requerido para manualPagination)
	 */
	pageSize?: number
	/**
	 * Callback cuando cambia la página (requerido para manualPagination)
	 */
	onPageChange?: (page: number) => void
	/**
	 * Función para obtener el ID de una fila
	 */
	getRowId?: (row: TData) => string
	/**
	 * Habilita la selección de filas
	 */
	enableRowSelection?: boolean
	/**
	 * El ID de la fila seleccionada (opcional)
	 */
	selectedRowIds?: RowSelectionState
	/**
	 * Función para renderizar un componente debajo de la fila si esta se expande
	 */
	renderSubComponent?: (props: { row: Row<TData> }) => ReactNode
	/**
	 * Función para determinar si una fila se puede expandir
	 */
	getRowCanExpand?: (row: Row<TData>) => boolean
	/**
	 * Función para renderizar filtros adicionales en el toolbar
	 */
	renderAdditionalFilters?: () => ReactNode
	/**
	 * Callback cuando se solicita exportar los datos
	 */
	onExport?: (data: TData[]) => void
}

