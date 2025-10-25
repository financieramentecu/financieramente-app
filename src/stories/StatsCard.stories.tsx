import type { Meta, StoryObj } from '@storybook/nextjs'
import { StatsCard } from '../components/ui/StatsCard'
import { ThemeProvider } from '../hooks/use-theme'
import { TrendingUp, TrendingDown, Minus, DollarSign, Users } from 'lucide-react'

const meta: Meta<typeof StatsCard> = {
  title: 'UI/StatsCard',
  component: StatsCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Tarjeta de estadística reutilizable para mostrar métricas del dashboard.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="w-80">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  argTypes: {
    title: {
      control: { type: 'text' },
      description: 'Título de la estadística'
    },
    value: {
      control: { type: 'text' },
      description: 'Valor principal a mostrar'
    },
    change: {
      control: { type: 'number' },
      description: 'Porcentaje de cambio'
    },
    trend: {
      control: { type: 'select' },
      options: ['up', 'down', 'neutral'],
      description: 'Tendencia del cambio'
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Total Negocios',
    value: '156',
    change: 12.5,
    trend: 'up',
    description: 'Negocios activos este mes'
  }
}

export const WithIcon: Story = {
  args: {
    title: 'Valor Total',
    value: '$2.845B',
    change: -3.2,
    trend: 'down',
    icon: <DollarSign className="h-4 w-4" />,
    description: 'Valor acumulado de todos los negocios'
  }
}

export const NeutralTrend: Story = {
  args: {
    title: 'Usuarios Activos',
    value: '1,234',
    change: 0,
    trend: 'neutral',
    icon: <Users className="h-4 w-4" />,
    description: 'Sin cambios este mes'
  }
}

export const WithoutChange: Story = {
  args: {
    title: 'Tasa de Conversión',
    value: '78.5%',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Porcentaje de conversión de leads'
  }
}

export const LargeValue: Story = {
  args: {
    title: 'Ingresos Mensuales',
    value: '$12,345,678',
    change: 25.8,
    trend: 'up',
    icon: <DollarSign className="h-4 w-4" />,
    description: 'Ingresos totales del mes actual'
  }
}

export const NegativeChange: Story = {
  args: {
    title: 'Clientes Perdidos',
    value: '23',
    change: -15.2,
    trend: 'down',
    icon: <TrendingDown className="h-4 w-4" />,
    description: 'Clientes que cancelaron sus servicios'
  }
}





