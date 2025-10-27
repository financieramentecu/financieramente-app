import type { Meta, StoryObj } from '@storybook/react'
import { StatsCardsSection } from '@/components/negocios/StatsCardsSection'
import { mockNegociosStatsData } from '../data/mockNegociosData'

const meta: Meta<typeof StatsCardsSection> = {
  title: 'Components/StatsCardsSection',
  component: StatsCardsSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Sección de tarjetas de estadísticas con gráficos pequeños ondulados.'
      }
    }
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Tarjetas de Estadísticas',
  args: {
    statsData: mockNegociosStatsData
  },
  parameters: {
    docs: {
      description: {
        story: 'Tarjetas mostrando estadísticas de negocios efectuados y emitidos con gráficos de tendencia.'
      }
    }
  }
}

export const SingleCard: Story = {
  name: 'Una Sola Tarjeta',
  args: {
    statsData: [mockNegociosStatsData[0]]
  },
  parameters: {
    docs: {
      description: {
        story: 'Vista con una sola tarjeta de estadística.'
      }
    }
  }
}
