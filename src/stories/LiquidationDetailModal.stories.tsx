import type { Meta, StoryObj } from '@storybook/nextjs'
import { LiquidationDetailModal } from '../components/ui/liquidation-detail-modal'
import { Button } from '../components/ui/button'
import { useState } from 'react'
import { ThemeProvider } from '../hooks/use-theme'
import { mockLiquidationDetails } from '../data/mockLiquidationData'

const meta: Meta<typeof LiquidationDetailModal> = {
  title: 'Business/LiquidationDetailModal',
  component: LiquidationDetailModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Modal para mostrar el detalle completo de una liquidación, incluyendo información del cliente, agente, producto y seguros.',
      }
    }
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="min-h-screen w-full p-8">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof LiquidationDetailModal>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <div className="space-y-4">
        <Button onClick={() => setOpen(true)}>
          Ver Detalle de Liquidación
        </Button>

        <LiquidationDetailModal
          open={open}
          onOpenChange={setOpen}
          liquidation={mockLiquidationDetails[0]}
          onEdit={() => {
            console.log('Edit clicked')
            alert('Función de edición activada')
          }}
          onCancel={() => {
            console.log('Cancel clicked')
            setOpen(false)
          }}
        />
      </div>
    )
  }
}

