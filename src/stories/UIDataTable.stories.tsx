import type { Meta, StoryObj } from '@storybook/nextjs'
import { DataTable } from '../features/shared/ui/DataTable/DataTable'
import { Badge } from '../features/shared/ui/badge'
import type { ColumnDef } from '@tanstack/react-table'
import { ThemeProvider } from '../features/shared/ui/ThemeProvider'

// Datos de ejemplo
const sampleData = [
	{
		id: 1,
		name: 'Juan Pérez',
		email: 'juan.perez@financieramente.com',
		role: 'Administrador',
		status: 'Activo',
		lastLogin: '2024-01-15',
		department: 'IT',
		salary: 5000,
	},
	{
		id: 2,
		name: 'María González',
		email: 'maria.gonzalez@financieramente.com',
		role: 'Usuario',
		status: 'Activo',
		lastLogin: '2024-01-14',
		department: 'Ventas',
		salary: 3500,
	},
	{
		id: 3,
		name: 'Carlos López',
		email: 'carlos.lopez@financieramente.com',
		role: 'Supervisor',
		status: 'Inactivo',
		lastLogin: '2024-01-10',
		department: 'Finanzas',
		salary: 4200,
	},
]

type UserRow = (typeof sampleData)[number]

const columns: ColumnDef<UserRow>[] = [
	{
		accessorKey: 'name',
		header: 'Nombre',
		cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
	},
	{
		accessorKey: 'email',
		header: 'Email',
	},
	{
		accessorKey: 'role',
		header: 'Rol',
		cell: ({ row }) => {
			const role = row.getValue('role') as string
			return (
				<Badge variant={role === 'Administrador' ? 'default' : 'secondary'}>
					{role}
				</Badge>
			)
		},
	},
	{
		accessorKey: 'status',
		header: 'Estado',
		cell: ({ row }) => {
			const status = row.getValue('status') as string
			return (
				<Badge variant={status === 'Activo' ? 'default' : 'destructive'}>
					{status}
				</Badge>
			)
		},
	},
	{
		accessorKey: 'salary',
		header: 'Salario',
		cell: ({ row }) => `$${Number(row.getValue('salary')).toLocaleString()}`,
	},
]

const meta: Meta<any> = {
	title: 'UI/DataTableAdvanced',
	component: DataTable,
	parameters: {
		layout: 'padded',
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
type Story = StoryObj<any>

export const Default: Story = {
	args: {
		data: sampleData,
		columns: columns as ColumnDef<any>[],
		searchable: true,
		manualPagination: false,
		pageSize: 10,
		emptyMessage: 'No hay usuarios disponibles',
	},
}

export const Loading: Story = {
	args: {
		data: [],
		columns: columns as ColumnDef<any>[],
		loading: true,
		emptyMessage: 'Cargando usuarios...',
	},
}

export const Selection: Story = {
	args: {
		data: sampleData,
		columns: columns as ColumnDef<any>[],
		onSelectionChange: (selected) => console.log('Selected:', selected),
	},
}
