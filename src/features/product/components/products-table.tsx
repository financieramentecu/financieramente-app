'use client'

import React from 'react'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Button } from '@/features/shared/ui/button'
import { Product } from '../types/product.types'
import { DataTableColumn } from '@/features/shared/ui/types/dashboard.types'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'

interface PaginationData {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface ProductsTableSectionProps {
	data: Product[]
	onAddProduct: () => void
	onGlobalSearch: (query: string) => void
	onEditProduct: (product: Product) => void
	onDeleteProduct: (product: Product) => void
	pagination?: PaginationData
	onPageChange?: (page: number) => void
	isSearching?: boolean
	companies?: Array<{
		idCompany: number
		name: string
		status: boolean
	}>
	selectedCompanyId?: number
	onCompanyChange?: (value: string) => void
}

export function ProductsTableSection({
	data,
	onAddProduct,
	onGlobalSearch,
	onEditProduct,
	onDeleteProduct,
	pagination,
	onPageChange,
	isSearching = false,
	companies,
	selectedCompanyId,
	onCompanyChange,
}: ProductsTableSectionProps) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('es-CO')
	}

	const getStatusBadge = (status: boolean) => {
		if (status) {
			return (
				<Badge
					variant="default"
					className="bg-emerald-100 text-emerald-800 border-emerald-200"
				>
					Activo
				</Badge>
			)
		}

		return (
			<Badge
				variant="default"
				className="bg-red-100 text-red-800 border-red-200"
			>
				Inactivo
			</Badge>
		)
	}

	const columns: DataTableColumn<Product>[] = [
		{
			key: 'idProduct',
			header: 'ID',
			cellRenderer: (_value, row) => (
				<span className="font-medium">#{row.idProduct}</span>
			),
		},
		{
			key: 'name',
			header: 'Nombre del Producto',
			cellRenderer: (value) => (
				<span className="font-medium">{value as string}</span>
			),
		},
		{
			key: 'company',
			header: 'Compañía',
			cellRenderer: (_value, row) => (
				<span className="font-medium">{row.company.name}</span>
			),
		},
		{
			key: 'status',
			header: 'Estado',
			cellRenderer: (value) => getStatusBadge(value as boolean),
		},
		{
			key: 'createdAt',
			header: 'Fecha Creación',
			cellRenderer: (value) => formatDate(value as string),
		},
		{
			key: 'updatedAt',
			header: 'Fecha Modificación',
			cellRenderer: (value) => formatDate(value as string),
		},
		{
			key: 'actions',
			header: 'Acciones',
			cellRenderer: (_, row) => {
				return (
					<div className="flex items-center gap-1">
						{/* Editar */}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEditProduct(row)}
							className="h-8 w-8 p-0 cursor-pointer"
							title="Editar"
						>
							<Pencil className="h-4 w-4" />
						</Button>

						{/* Eliminar */}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onDeleteProduct(row)}
							className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
							title="Eliminar"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				)
			},
		},
	]

	return (
		<div className="space-y-4">
			{/* Table Header with Add Button */}
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Lista de Productos</h3>
				<Button onClick={onAddProduct} className="gap-2 cursor-pointer">
					<Plus className="h-4 w-4" />
					Nuevo Producto
				</Button>
			</div>

			{/* Data Table */}
			<DataTable
				columns={columns}
				data={data}
				searchable={true}
				onGlobalSearch={onGlobalSearch}
				loading={isSearching}
				searchPlaceholder="Buscar por nombre de producto..."
				renderAdditionalFilters={
					companies && onCompanyChange
						? () => (
								<Select
									value={
										selectedCompanyId === undefined
											? 'all'
											: selectedCompanyId.toString()
									}
									onValueChange={onCompanyChange}
								>
									<SelectTrigger className="w-[250px]">
										<SelectValue placeholder="Filtrar por empresa" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Todas las empresas</SelectItem>
										{companies.map((company) => (
											<SelectItem
												key={company.idCompany}
												value={company.idCompany.toString()}
											>
												{company.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)
						: undefined
				}
				pagination={
					pagination
						? {
								currentPage: pagination.page,
								pageSize: pagination.pageSize,
								totalItems: pagination.total,
								onPageChange: onPageChange || (() => {}),
							}
						: {
								currentPage: 1,
								pageSize: 10,
								totalItems: data.length,
								onPageChange: () => {},
							}
				}
			/>
		</div>
	)
}
