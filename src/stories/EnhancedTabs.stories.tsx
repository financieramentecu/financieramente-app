import type { Meta, StoryObj } from '@storybook/react'
import { EnhancedTabs } from '@/components/negocios/EnhancedTabs'
import { SearchFilterCard } from '@/components/negocios/SearchFilterCard'

const meta: Meta<typeof EnhancedTabs> = {
  title: 'Components/EnhancedTabs',
  component: EnhancedTabs,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Componente de tabs mejorado con estilos específicos del diseño.'
      }
    }
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Tabs con Card de Búsqueda',
  args: {
    onTabChange: (tab) => console.log('Tab changed:', tab),
    children: (
      <SearchFilterCard 
        onSearch={(params) => console.log('Search:', params)}
        onShowAll={() => console.log('Show all')}
      />
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Tabs con el card de búsqueda como contenido del tab activo.'
      }
    }
  }
}

export const WithCustomContent: Story = {
  name: 'Con Contenido Personalizado',
  args: {
    onTabChange: (tab) => console.log('Tab changed:', tab),
    children: (
      <div className="p-6 border rounded-lg bg-card">
        <h3 className="text-lg font-semibold mb-2">Contenido Personalizado</h3>
        <p className="text-muted-foreground">
          Este es un ejemplo de contenido personalizado dentro del tab.
        </p>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Tabs con contenido personalizado en lugar del card de búsqueda.'
      }
    }
  }
}
