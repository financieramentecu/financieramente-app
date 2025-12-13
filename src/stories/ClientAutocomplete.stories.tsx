import type { Meta, StoryObj } from '@storybook/nextjs'
import { ClientAutocomplete } from '../features/negocios/components/client-autocomplete'
import { ThemeProvider } from '../features/shared/ui/ThemeProvider'
import { mockUsers } from '../features/shared/__tests__/fixtures/mockUsers'
import * as React from 'react'

const meta: Meta<typeof ClientAutocomplete> = {
	title: 'Business/DocumentAutocomplete',
	component: ClientAutocomplete,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Componente de autocomplete para buscar y seleccionar documentos de usuarios existentes o crear uno nuevo. Soporta búsqueda por documento, nombre o apellido.',
			},
		},
	},
	decorators: [
		(Story) => (
			<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
				<div className="min-h-screen w-full p-8 bg-gray-50">
					<Story />
				</div>
			</ThemeProvider>
		),
	],
}

export default meta
type Story = StoryObj<typeof ClientAutocomplete>

// Wrapper component para manejar el estado
const InteractiveWrapper = ({
	users = mockUsers,
	showCreate = true,
	onCreateNew,
}: {
	users?: typeof mockUsers
	showCreate?: boolean
	onCreateNew?: (doc: string) => void
}) => {
	const [value, setValue] = React.useState('')

	return (
		<div className="max-w-md space-y-4">
			<ClientAutocomplete
				value={value}
				onChange={setValue}
				users={users}
				placeholder="Buscar o crear documento..."
				onCreateNew={showCreate ? onCreateNew : undefined}
			/>
			<div className="text-sm text-gray-600">
				<p>
					Documento seleccionado: <strong>{value || 'Ninguno'}</strong>
				</p>
			</div>
		</div>
	)
}

export const Default: Story = {
	render: () => <InteractiveWrapper />,
}

export const WithCreateNew: Story = {
	render: () => (
		<InteractiveWrapper
			showCreate
			onCreateNew={(doc) => {
				console.log('Creando nuevo usuario:', doc)
				alert(`Se creará un nuevo usuario con documento: ${doc}`)
			}}
		/>
	),
}

export const WithoutCreateOption: Story = {
	render: () => <InteractiveWrapper showCreate={false} />,
}

export const EmptyList: Story = {
	render: () => <InteractiveWrapper users={[]} />,
}

export const PreSelected: Story = {
	render: () => {
		const [value, setValue] = React.useState('1053.123.456')
		return (
			<div className="max-w-md space-y-4">
				<ClientAutocomplete
					value={value}
					onChange={setValue}
					users={mockUsers}
					placeholder="Buscar o crear documento..."
				/>
				<div className="text-sm text-gray-600">
					<p>
						Documento seleccionado: <strong>{value}</strong>
					</p>
				</div>
			</div>
		)
	},
}
