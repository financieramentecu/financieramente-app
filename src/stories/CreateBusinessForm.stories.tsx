import type { Meta, StoryObj } from '@storybook/nextjs'
import { CreateBusinessForm } from '../components/ui/create-business-form'
import { ThemeProvider } from '../hooks/use-theme'
import { mockBusinessFormDefaultValues } from '../data/mockBusinessFormData'
import { mockUsers } from '../data/mockUsers'
import { mockAgents } from '../data/mockAgents'

const meta: Meta<typeof CreateBusinessForm> = {
	title: 'Business/CreateBusinessForm',
	component: CreateBusinessForm,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Formulario para crear un nuevo negocio con validaciones usando Zod. El campo No. Documento ahora incluye autocomplete para buscar usuarios existentes o crear uno nuevo.',
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
type Story = StoryObj<typeof CreateBusinessForm>

export const Default: Story = {
	args: {
		defaultValues: mockBusinessFormDefaultValues,
		users: mockUsers,
		agents: mockAgents,
		onSubmit: async (data) => {
			console.log('Form submitted:', data)
			alert(`Formulario enviado con datos:\n${JSON.stringify(data, null, 2)}`)
		},
		onCancel: () => {
			console.log('Form cancelled')
			alert('Formulario cancelado')
		},
	},
}

export const Empty: Story = {
	args: {
		users: mockUsers,
		agents: mockAgents,
		onSubmit: async (data) => {
			console.log('Form submitted:', data)
		},
		onCancel: () => {
			console.log('Form cancelled')
		},
	},
}

export const WithValidation: Story = {
	args: {
		defaultValues: mockBusinessFormDefaultValues,
		users: mockUsers,
		agents: mockAgents,
		onSubmit: async (data) => {
			console.log('Form submitted:', data)
			// Simular validación adicional
			await new Promise((resolve) => setTimeout(resolve, 1000))
		},
		onCancel: () => {
			console.log('Form cancelled')
		},
	},
}

export const WithUserCreation: Story = {
	args: {
		users: mockUsers,
		agents: mockAgents,
		onSubmit: async (data) => {
			console.log('Form submitted:', data)
			alert(`Formulario enviado con datos:\n${JSON.stringify(data, null, 2)}`)
		},
		onUserCreated: async (documento) => {
			console.log('Creating new user:', documento)
			alert(`Se creará un nuevo usuario con documento: ${documento}`)
		},
		onCancel: () => {
			console.log('Form cancelled')
		},
	},
}

export const CreateNewUserFlow: Story = {
	args: {
		users: mockUsers,
		agents: mockAgents,
		onSubmit: async (data) => {
			console.log('Form submitted:', data)
			alert(`Formulario enviado con datos:\n${JSON.stringify(data, null, 2)}`)
		},
		onUserCreated: async (documento) => {
			console.log('Creating new user:', documento)
			alert(
				`✅ Nuevo usuario creado exitosamente con documento: ${documento}\n\nAhora puedes completar los campos del formulario para crear el negocio.`
			)
		},
		onCancel: () => {
			console.log('Form cancelled')
			alert('Operación cancelada')
		},
	},
}

export const LargeUserList: Story = {
	args: {
		users: [
			...mockUsers,
			{
				numeroDocumento: '1111.222.333',
				nombres: 'Roberto',
				apellidos: 'Vargas',
				email: 'roberto.vargas@gmail.com',
			},
			{
				numeroDocumento: '2222.333.444',
				nombres: 'Patricia',
				apellidos: 'Morales',
				email: 'patricia.morales@gmail.com',
			},
			{
				numeroDocumento: '3333.444.555',
				nombres: 'Andrés',
				apellidos: 'Castro',
				email: 'andres.castro@gmail.com',
			},
			{
				numeroDocumento: '4444.555.666',
				nombres: 'Fernanda',
				apellidos: 'Ruiz',
				email: 'fernanda.ruiz@gmail.com',
			},
			{
				numeroDocumento: '5555.666.777',
				nombres: 'Javier',
				apellidos: 'Herrera',
				email: 'javier.herrera@gmail.com',
			},
		],
		agents: mockAgents,
		onSubmit: async (data) => {
			console.log('Form submitted with large list:', data)
			alert(`Formulario enviado con datos:\n${JSON.stringify(data, null, 2)}`)
		},
		onUserCreated: async (documento) => {
			console.log('Creating new user:', documento)
			alert(`Nuevo usuario creado: ${documento}`)
		},
		onCancel: () => {
			console.log('Form cancelled')
		},
	},
}
