import type { Meta, StoryObj } from '@storybook/nextjs'
import { DataTable } from '../features/shared/ui/DataTable/DataTable'
import { ThemeProvider } from '../features/shared/ui/ThemeProvider'
import { mockBusinessList } from '../features/shared/__tests__/fixtures/mockBusinessData'
import type { ColumnDef } from '@tanstack/react-table'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '../features/shared/ui/avatar'
import { Badge } from '../features/shared/ui/badge'

type Business = typeof mockBusinessList[0]

const meta: Meta<typeof DataTable<Business>> = {
	title: 'UI/DataTableGeneric',
	component: DataTable,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Tabla genérica reutilizable para mostrar cualquier tipo de datos.',
			},
		},
	},
	decorators: [
		(Story) => (
			<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
				<div className="w-full max-w-6xl">
					<Story />
				</div>
			</ThemeProvider>
		),
	],
}

export default meta
type Story = StoryObj<typeof DataTable<Business>>

const businessColumns: ColumnDef<Business, unknown>[] = [
	{
		accessorKey: 'identification',
		header: 'Identificación',
		cell: ({ row }) => (
			<span className="font-medium">{row.getValue('identification') as string}</span>
		),
	},
	{
		accessorKey: 'user',
		header: 'Usuario',
		cell: ({ row }) => {
			const user = row.getValue('user') as { avatar: string; name: string }
			return (
				<div className="flex items-center gap-3">
					<Avatar className="h-8 w-8">
						<AvatarImage src={user.avatar} alt={user.name} />
						<AvatarFallback>
							{user.name
								.split(' ')
								.map((n: string) => n[0])
								.join('')}
						</AvatarFallback>
					</Avatar>
					<span className="font-medium">{user.name}</span>
				</div>
			)
		},
	},
	{
		accessorKey: 'email',
		header: 'Email',
		cell: ({ row }) => (
			<span className="text-muted-foreground">{row.getValue('email')}</span>
		),
	},
	{
		accessorKey: 'value',
		header: 'Valor',
		cell: ({ row }) => (
			<span className="font-medium">
				{new Intl.NumberFormat('es-CO', {
					style: 'currency',
					currency: 'COP',
					minimumFractionDigits: 0,
				}).format(row.getValue('value') as number)}
			</span>
		),
	},
	{
		accessorKey: 'status',
		header: 'Estado',
		cell: ({ row }) => {
			const value = row.getValue('status') as string
			return (
				<Badge
					variant={value === 'Emitido' ? 'default' : 'secondary'}
					className={
						value === 'Emitido'
							? 'bg-blue-100 text-blue-800'
							: 'bg-green-100 text-green-800'
					}
				>
					{value}
				</Badge>
			)
		},
	},
]

export const Default: Story = {
	args: {
		columns: businessColumns,
		data: mockBusinessList,
		searchable: true,
		onGlobalSearch: (query: string) => console.log('Search:', query),
		manualPagination: true,
		currentPage: 1,
		pageSize: 10,
		totalItems: mockBusinessList.length,
		onPageChange: (page: number) => console.log('Page changed:', page),
	},
}

export const WithoutSearch: Story = {
	args: {
		columns: businessColumns,
		data: mockBusinessList.slice(0, 5),
		searchable: false,
		manualPagination: true,
		currentPage: 1,
		pageSize: 5,
		totalItems: 5,
		onPageChange: (page: number) => console.log('Page changed:', page),
	},
}

export const EmptyState: Story = {
	args: {
		columns: businessColumns,
		data: [],
		searchable: true,
		onGlobalSearch: (query: string) => console.log('Search:', query),
	},
}

export const LoadingState: Story = {
	args: {
		columns: businessColumns,
		data: [],
		loading: true,
		searchable: true,
		onGlobalSearch: (query: string) => console.log('Search:', query),
	},
}

export const WithoutPagination: Story = {
	args: {
		columns: businessColumns,
		data: mockBusinessList.slice(0, 3),
		searchable: true,
		onGlobalSearch: (query: string) => console.log('Search:', query),
	},
}
