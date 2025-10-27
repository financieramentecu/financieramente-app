import type { Meta, StoryObj } from '@storybook/nextjs'
import { NegociosHomePage } from '../components/negocios/NegociosHomePage'

const meta: Meta<typeof NegociosHomePage> = {
  title: 'Pages/NegociosHomePage',
  component: NegociosHomePage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Página principal de gestión de negocios con estadísticas, filtros de búsqueda y tabla de datos.'
      }
    }
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Página Principal de Negocios',
  parameters: {
    docs: {
      description: {
        story: 'Vista completa de la interfaz de gestión de negocios con todos los componentes integrados.'
      }
    }
  }
}

export const Mobile: Story = {
  name: 'Vista Móvil',
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Vista de la página en dispositivos móviles con layout responsivo.'
      }
    }
  }
}

export const Tablet: Story = {
  name: 'Vista Tablet',
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Vista de la página en tablets con layout adaptativo.'
      }
    }
  }
}
