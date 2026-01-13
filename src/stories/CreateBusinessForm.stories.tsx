import type { Meta, StoryObj } from '@storybook/nextjs'
import { BusinessForm } from '../features/negocios/components/business-form'
import { ThemeProvider } from '../features/shared/ui/ThemeProvider'
import { mockBusinessFormDefaultValues } from '../features/shared/__tests__/fixtures/mockBusinessFormData'
import { mockUserWithRole } from '../features/shared/__tests__/fixtures/mockUserWithRole'

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

const mockClientOriginsOptions = [
	{ value: '1', label: 'Propio' },
	{ value: '2', label: 'Metodo Vortex' },
	{ value: '3', label: 'Asesoria Gratuita' },
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
		currentUser: mockUserWithRole,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
		clientOriginsOptions: mockClientOriginsOptions,
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
		currentUser: mockUserWithRole,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
		clientOriginsOptions: mockClientOriginsOptions,
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
		currentUser: mockUserWithRole,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
		clientOriginsOptions: mockClientOriginsOptions,
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
		currentUser: mockUserWithRole,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
		clientOriginsOptions: mockClientOriginsOptions,
		onSubmit: async (data) => {
			console.log('Form submitted:', data)
			alert(
				`Formulario enviado con datos:\n${JSON.stringify(data, null, 2)}\n\nEl cliente se creará automáticamente si no existe en la base de datos.`
			)
		},
		onCancel: () => {
			console.log('Form cancelled')
		},
	},
}

export const CreateNewUserFlow: Story = {
	args: {
		currentUser: mockUserWithRole,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
		clientOriginsOptions: mockClientOriginsOptions,
		onSubmit: async (data) => {
			console.log('Form submitted:', data)
			alert(
				`✅ Formulario enviado con datos:\n${JSON.stringify(data, null, 2)}\n\nEl cliente se creará automáticamente al enviar el formulario si no existe en la base de datos.`
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
		currentUser: mockUserWithRole,
		companiesOptions: mockCompaniesOptions,
		productsOptions: mockProductsOptions,
		periodicitiesOptions: mockPeriodicitiesOptions,
		currenciesOptions: mockCurrenciesOptions,
		clientOriginsOptions: mockClientOriginsOptions,
		onSubmit: async (data) => {
			console.log('Form submitted with large list:', data)
			alert(`Formulario enviado con datos:\n${JSON.stringify(data, null, 2)}`)
		},
		onCancel: () => {
			console.log('Form cancelled')
		},
	},
}
