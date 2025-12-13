import type { Meta, StoryObj } from '@storybook/nextjs'
import { BusinessForm } from '../features/negocios/components/business-form'
import { ThemeProvider } from '../features/shared/ui/ThemeProvider'
import { mockBusinessFormDefaultValues } from '../features/shared/__tests__/fixtures/mockBusinessFormData'
import { mockUsers } from '../features/shared/__tests__/fixtures/mockUsers'
import { mockAgents } from '../features/shared/__tests__/fixtures/mockAgents'
import { Client } from '@prisma/client'

// Mock data para las opciones del formulario
const mockCompaniesOptions = [
	{ value: '1', label: 'SKANDIA' },
	{ value: '2', label: 'Seguros Bolívar' },
	{ value: '3', label: 'Sura' },
]

const mockProductsOptions = [
	{ value: '1', label: 'CREA PATRIMONIO', companyId: '1' },
	{ value: '2', label: 'MFUND', companyId: '1' },
	{ value: '3', label: 'FPOB', companyId: '1' },
	{ value: '4', label: 'CES', companyId: '1' },
	{ value: '5', label: 'MACONDO', companyId: '1' },
	{ value: '6', label: 'C+S', companyId: '1' },
	{ value: '7', label: 'ACCAI', companyId: '1' },
	{ value: '8', label: 'EXECUTIVE 20', companyId: '1' },
	{ value: '9', label: 'CPA', companyId: '1' },
	{ value: '10', label: 'Producto Bolívar 1', companyId: '2' },
	{ value: '11', label: 'Producto Sura 1', companyId: '3' },
]

const mockPeriodicitiesOptions = [
	{ value: '1', label: 'Anual' },
	{ value: '2', label: 'Semestral' },
	{ value: '3', label: 'Cuatrimestral' },
	{ value: '4', label: 'Trimestral' },
	{ value: '5', label: 'Bimensual' },
	{ value: '6', label: 'Mensual' },
	{ value: '7', label: 'Aportes Ocasionales' },
	{ value: '8', label: 'Pago Único' },
]

const mockCurrenciesOptions = [
	{ value: '1', label: 'Peso Colombiano (COP)' },
	{ value: '2', label: 'Dólar Americano (USD)' },
]

const meta: Meta<typeof BusinessForm> = {
	title: 'Business/CreateBusinessForm',
	component: BusinessForm,
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
type Story = StoryObj<typeof BusinessForm>

export const Default: Story = {
	args: {
		defaultValues: mockBusinessFormDefaultValues,
		clients: mockUsers,
		agents: mockAgents,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
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
		clients: mockUsers,
		agents: mockAgents,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
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
		clients: mockUsers,
		agents: mockAgents,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
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
		clients: mockUsers,
		agents: mockAgents,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
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
		clients: mockUsers,
		agents: mockAgents,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
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

const baseDate = new Date('2024-01-01T00:00:00.000Z')

const additionalMockClients: Client[] = [
	{
		idClient: 11,
		name: 'Roberto',
		lastName: 'Vargas',
		typeIdentity: 'CC',
		identityNumber: '1111.222.333',
		idClientOrigin: 1,
		email: 'roberto.vargas@gmail.com',
		phone: '3001111111',
		direcction: 'Calle 111 #222-333',
		city: 'Medellín',
		country: 'Colombia',
		active: true,
		createdAt: baseDate,
		updatedAt: baseDate,
	},
	{
		idClient: 12,
		name: 'Patricia',
		lastName: 'Morales',
		typeIdentity: 'CC',
		identityNumber: '2222.333.444',
		idClientOrigin: 1,
		email: 'patricia.morales@gmail.com',
		phone: '3002222222',
		direcction: 'Carrera 222 #333-444',
		city: 'Bogotá',
		country: 'Colombia',
		active: true,
		createdAt: baseDate,
		updatedAt: baseDate,
	},
	{
		idClient: 13,
		name: 'Andrés',
		lastName: 'Castro',
		typeIdentity: 'CC',
		identityNumber: '3333.444.555',
		idClientOrigin: 1,
		email: 'andres.castro@gmail.com',
		phone: '3003333333',
		direcction: 'Avenida 333 #444-555',
		city: 'Cali',
		country: 'Colombia',
		active: true,
		createdAt: baseDate,
		updatedAt: baseDate,
	},
	{
		idClient: 14,
		name: 'Fernanda',
		lastName: 'Ruiz',
		typeIdentity: 'CC',
		identityNumber: '4444.555.666',
		idClientOrigin: 1,
		email: 'fernanda.ruiz@gmail.com',
		phone: '3004444444',
		direcction: 'Calle 444 #555-666',
		city: 'Barranquilla',
		country: 'Colombia',
		active: true,
		createdAt: baseDate,
		updatedAt: baseDate,
	},
	{
		idClient: 15,
		name: 'Javier',
		lastName: 'Herrera',
		typeIdentity: 'CC',
		identityNumber: '5555.666.777',
		idClientOrigin: 1,
		email: 'javier.herrera@gmail.com',
		phone: '3005555555',
		direcction: 'Carrera 555 #666-777',
		city: 'Cartagena',
		country: 'Colombia',
		active: true,
		createdAt: baseDate,
		updatedAt: baseDate,
	},
]

export const LargeUserList: Story = {
	args: {
		clients: [...mockUsers, ...additionalMockClients],
		agents: mockAgents,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
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
