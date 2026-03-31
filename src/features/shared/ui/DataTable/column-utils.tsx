import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/features/shared/ui/badge'

/**
 * Utilidades para crear definiciones de columnas comunes
 */
export const createColumnDefs = {
	/**
	 * Columna de texto simple
	 */
	text: <TData,>(
		accessorKey: keyof TData | string,
		header: string,
		options: { searchable?: boolean } = {}
	): ColumnDef<TData> => ({
		accessorKey: accessorKey as string,
		header,
		enableColumnFilter: options.searchable,
	}),

	/**
	 * Columna con Badge para estados
	 */
	badge: <TData,>(
		accessorKey: keyof TData | string,
		header: string,
		options: {
			getVariant?: (value: any) => 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'neutral'
			getLabel?: (value: any) => string
		} = {}
	): ColumnDef<TData> => ({
		accessorKey: accessorKey as string,
		header,
		cell: ({ row }) => {
			const value = row.getValue(accessorKey as string)
			const variant = options.getVariant ? options.getVariant(value) : 'default'
			const label = options.getLabel ? options.getLabel(value) : String(value)
			
			return (
				<Badge variant={variant as any}>
					{label}
				</Badge>
			)
		},
	}),

	/**
	 * Columna de fecha formateada
	 */
	date: <TData,>(
		accessorKey: keyof TData | string,
		header: string,
		options: { formatStr?: string } = {}
	): ColumnDef<TData> => ({
		accessorKey: accessorKey as string,
		header,
		cell: ({ row }) => {
			const value = row.getValue(accessorKey as string)
			if (!value) return '—'
			try {
				return format(new Date(value as string), options.formatStr || 'PP', { locale: es })
			} catch (e) {
				return String(value)
			}
		},
	}),

	/**
	 * Columna de moneda
	 */
	currency: <TData,>(
		accessorKey: keyof TData | string,
		header: string,
		options: { currency?: string; locale?: string } = {}
	): ColumnDef<TData> => ({
		accessorKey: accessorKey as string,
		header,
		cell: ({ row }) => {
			const value = row.getValue(accessorKey as string)
			if (typeof value !== 'number') return '—'
			return new Intl.NumberFormat(options.locale || 'es-CO', {
				style: 'currency',
				currency: options.currency || 'COP',
			}).format(value)
		},
	}),
}
