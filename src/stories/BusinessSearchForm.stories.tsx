import type { Meta, StoryObj } from '@storybook/nextjs'
import { BusinessSearchForm } from '../features/negocios/components/BusinessSearchForm'
import { ThemeProvider } from '../features/shared/ui/ThemeProvider'
import { BusinessSearchParams } from '../features/negocios/types/business.types'

const meta: Meta<typeof BusinessSearchForm> = {
	title: 'Business/BusinessSearchForm',
	component: BusinessSearchForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'Formulario de búsqueda de negocios con diferentes criterios.',
			},
		},
	},
	decorators: [
		(Story) => (
			<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
				<div className="w-full max-w-2xl">
					<Story />
				</div>
			</ThemeProvider>
		),
	],
	argTypes: {
		onSearch: {
			action: 'search',
			description: 'Función llamada cuando se realiza una búsqueda',
		},
		onShowAll: {
			action: 'showAll',
			description: 'Función llamada cuando se hace clic en "Mostrar todos"',
		},
	},
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		onSearch: (params: BusinessSearchParams) => {
			console.log('Search params:', params)
		},
		onShowAll: () => {
			console.log('Show all businesses')
		},
	},
}

export const WithInitialValues: Story = {
	args: {
		onSearch: (params: BusinessSearchParams) => {
			console.log('Search params:', params)
		},
		onShowAll: () => {
			console.log('Show all businesses')
		},
	},
	parameters: {
		docs: {
			description: {
				story: 'Formulario con valores iniciales predefinidos.',
			},
		},
	},
}
