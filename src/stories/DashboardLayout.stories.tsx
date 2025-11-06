import type { Meta, StoryObj } from '@storybook/nextjs'
import { DashboardLayout } from '../layouts/DashboardLayout'

const meta: Meta<typeof DashboardLayout> = {
  title: 'Layouts/DashboardLayout',
  component: DashboardLayout,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'desktop',
    },
  },
  argTypes: {
    currentPage: {
      control: 'text',
      description: 'Título de la página actual',
    },
  },
  args: {
    currentPage: 'Mis Negocios',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div className="flex h-full items-center justify-center text-2xl font-bold">
        Contenido de la página
      </div>
    ),
  },
}

export const WithMisNegociosPage: Story = {
  args: {
    currentPage: 'Mis Negocios',
    children: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Mis Negocios</h2>
        <p className="text-muted-foreground">
          Aquí se mostrará el contenido de la página de Mis Negocios.
        </p>
      </div>
    ),
  },
}

export const WithDistribucionPage: Story = {
  args: {
    currentPage: 'Distribución',
    children: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Distribución</h2>
        <p className="text-muted-foreground">
          Aquí se mostrará el contenido de la página de distribución.
        </p>
      </div>
    ),
  },
}

export const WithPreliquidacionPage: Story = {
  args: {
    currentPage: 'Pre-liquidación',
    children: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Pre-liquidación</h2>
        <p className="text-muted-foreground">
          Aquí se mostrará el contenido de la página de pre-liquidación.
        </p>
      </div>
    ),
  },
}

export const WithLiquidacionPage: Story = {
  args: {
    currentPage: 'Liquidación',
    children: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Liquidación</h2>
        <p className="text-muted-foreground">
          Aquí se mostrará el contenido de la página de liquidación.
        </p>
      </div>
    ),
  },
}
