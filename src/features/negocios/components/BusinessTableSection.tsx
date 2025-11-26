'use client'

import React from 'react'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Button } from '@/features/shared/ui/button'
import { Business } from '@/features/negocios/types/business.types'
import { DataTableColumn } from '@/features/shared/ui/types/dashboard.types'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil } from 'lucide-react'

interface BusinessTableSectionProps {
	data: Business[]
	onAddBusiness: () => void
	onGlobalSearch: (query: string) => void
	onEditBusiness: (business: Business) => void
}

export function BusinessTableSection({
	data,
	onAddBusiness,
	onGlobalSearch,
	onEditBusiness,
}: BusinessTableSectionProps) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('es-CO', {
			style: 'currency',
			currency: 'COP',
			minimumFractionDigits: 0,
		}).format(value)
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('es-CO')
	}

	const getStatusBadge = (status: string) => {
		const isEmitido = status === 'Emitido'
		return (
			<Badge
				variant={isEmitido ? 'default' : 'secondary'}
				className={
					isEmitido
						? 'bg-primary/10 text-primary border-primary/20'
						: 'bg-secondary/10 text-secondary-foreground border-secondary/20'
				}
			>
				{status}
			</Badge>
		)
	}

	const columns: DataTableColumn<Business>[] = [
		{
			key: 'id',
			header: '# Negocio',
			cellRenderer: (value, row) => (
				<span className="font-medium">#{row.id}</span>
			),
		},
		{
			key: 'identification',
			header: 'Identificación',
			cellRenderer: (value) => (
				<span className="font-medium">{value as string}</span>
			),
		},
		{
			key: 'user',
			header: 'Usuario',
			cellRenderer: (user) => {
				const userData = user as Business['user']
				return (
					<div className="flex items-center gap-3">
						<Avatar className="h-8 w-8">
							<AvatarImage src={userData.avatar} alt={userData.name} />
							<AvatarFallback>
								{userData.name
									.split(' ')
									.map((n: string) => n[0])
									.join('')}
							</AvatarFallback>
						</Avatar>
						<span className="font-medium">{userData.name}</span>
					</div>
				)
			},
		},
		{
			key: 'email',
			header: 'Email',
			cellRenderer: (value) => (
				<span className="text-muted-foreground">{value as string}</span>
			),
		},
		{
			key: 'termPeriod',
			header: 'Plazo / periodo',
			cellRenderer: (value) => <span>{value as string}</span>,
		},
		{
			key: 'date',
			header: 'Fecha',
			cellRenderer: (value) => formatDate(value as string),
		},
		{
			key: 'value',
			header: 'Valor',
			cellRenderer: (value) => (
				<span className="font-medium">{formatCurrency(value as number)}</span>
			),
		},
		{
			key: 'product',
			header: 'Producto',
			cellRenderer: (value) => <span>{value as string}</span>,
		},
		{
			key: 'status',
			header: 'Estado',
			cellRenderer: (value) => getStatusBadge(value as string),
		},
		{
			key: 'actions',
			header: 'Action',
			cellRenderer: (_, row) => (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onEditBusiness(row)}
					className="h-8 w-8 p-0"
				>
					<Pencil className="h-4 w-4" />
				</Button>
			),
		},
	]

	return (
		<div className="space-y-4">
			{/* Table Header with Add Button */}
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Lista de Negocios</h3>
				<Button onClick={onAddBusiness} className="gap-2 cursor-pointer">
					<Plus className="h-4 w-4" />
					Agregar negocio
				</Button>
			</div>

			{/* Data Table */}
			<DataTable
				columns={columns}
				data={data}
				searchable={true}
				onGlobalSearch={onGlobalSearch}
				pagination={{
					currentPage: 1,
					pageSize: 10,
					totalItems: data.length,
					onPageChange: (page) => console.log('Page changed:', page),
				}}
			/>
		</div>
	)
}
