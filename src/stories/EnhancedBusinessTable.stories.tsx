import type { Meta, StoryObj } from '@storybook/react'
import { EnhancedBusinessTable } from '@/components/negocios/EnhancedBusinessTable'
import { mockNegociosBusinessData } from '../data/mockNegociosData'

const meta: Meta<typeof EnhancedBusinessTable> = {
  title: 'Components/EnhancedBusinessTable',
  component: EnhancedBusinessTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Tabla mejorada de negocios con columna # Negocio, estados específicos y acciones.'
      }
    }
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Tabla de Negocios',
  args: {
    data: mockNegociosBusinessData,
    onAddBusiness: () => console.log('Add business'),
    onGlobalSearch: (query) => console.log('Global search:', query),
    onEditBusiness: (business) => console.log('Edit business:', business),
  },
  parameters: {
    docs: {
      description: {
        story: 'Tabla completa de negocios con todas las columnas, estados con colores específicos y paginación.'
      }
    }
  }
}

export const EmptyState: Story = {
  name: 'Estado Vacío',
  args: {
    data: [],
    onAddBusiness: () => console.log('Add business'),
    onGlobalSearch: (query) => console.log('Global search:', query),
    onEditBusiness: (business) => console.log('Edit business:', business),
  },
  parameters: {
    docs: {
      description: {
        story: 'Tabla sin datos para mostrar el estado vacío.'
      }
    }
  }
}

export const SingleRow: Story = {
  name: 'Una Fila',
  args: {
    data: [mockNegociosBusinessData[0]],
    onAddBusiness: () => console.log('Add business'),
    onGlobalSearch: (query) => console.log('Global search:', query),
    onEditBusiness: (business) => console.log('Edit business:', business),
  },
  parameters: {
    docs: {
      description: {
        story: 'Tabla con una sola fila de datos.'
      }
    }
  }
}
