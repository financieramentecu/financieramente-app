import type { Meta, StoryObj } from '@storybook/nextjs'
import { CreateBusinessForm } from '../components/ui/create-business-form'
import { ThemeProvider } from '../hooks/use-theme'
import { mockBusinessFormDefaultValues } from '../data/mockBusinessFormData'

const meta: Meta<typeof CreateBusinessForm> = {
  title: 'Business/CreateBusinessForm',
  component: CreateBusinessForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Formulario para crear un nuevo negocio con validaciones usando Zod. Todos los campos se bloquean hasta que se ingrese la cédula.',
      }
    }
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
    onSubmit: async (data) => {
      console.log('Form submitted:', data)
      alert(`Formulario enviado con datos:\n${JSON.stringify(data, null, 2)}`)
    },
    onCancel: () => {
      console.log('Form cancelled')
      alert('Formulario cancelado')
    },
  }
}

export const Empty: Story = {
  args: {
    onSubmit: async (data) => {
      console.log('Form submitted:', data)
    },
    onCancel: () => {
      console.log('Form cancelled')
    },
  }
}

export const WithValidation: Story = {
  args: {
    defaultValues: mockBusinessFormDefaultValues,
    onSubmit: async (data) => {
      console.log('Form submitted:', data)
      // Simular validación adicional
      await new Promise(resolve => setTimeout(resolve, 1000))
    },
    onCancel: () => {
      console.log('Form cancelled')
    },
  }
}

