import type { Meta, StoryObj } from '@storybook/nextjs'
import { BusinessManagementHeader } from '../components/negocios/BusinessManagementHeader'

const meta: Meta<typeof BusinessManagementHeader> = {
  title: 'Components/BusinessManagementHeader',
  component: BusinessManagementHeader,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Header con título y subtítulo para la sección de gestión de negocios.'
      }
    }
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Header por Defecto',
  parameters: {
    docs: {
      description: {
        story: 'Header con título y subtítulo por defecto.'
      }
    }
  }
}

export const CustomTitle: Story = {
  name: 'Título Personalizado',
  args: {
    title: 'Mi Panel de Negocios',
    subtitle: 'Gestiona todos tus negocios desde aquí'
  },
  parameters: {
    docs: {
      description: {
        story: 'Header con título y subtítulo personalizados.'
      }
    }
  }
}

export const LongText: Story = {
  name: 'Texto Largo',
  args: {
    title: 'Gestión Completa de Negocios y Transacciones',
    subtitle: 'Busca, edita, crea y administra información completa de todos los negocios registrados en el sistema'
  },
  parameters: {
    docs: {
      description: {
        story: 'Header con textos largos para probar el comportamiento responsivo.'
      }
    }
  }
}
