import type { Meta, StoryObj } from '@storybook/nextjs'
import { CancelBusinessModal } from '../features/shared/ui/cancel-business-modal'
import { Button } from '../features/shared/ui/button'
import { useState } from 'react'
import { ThemeProvider } from '../features/shared/ui/ThemeProvider'

const meta: Meta<typeof CancelBusinessModal> = {
	title: 'Business/CancelBusinessModal',
	component: CancelBusinessModal,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'Modal para cancelar un negocio con campo de texto requerido para explicar el motivo.',
			},
		},
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
type Story = StoryObj<typeof CancelBusinessModal>

export const Default: Story = {
	render: () => {
		const [open, setOpen] = useState(false)
		const [cancelledId, setCancelledId] = useState<string | null>(null)

		return (
			<div className="space-y-4">
				<Button onClick={() => setOpen(true)}>
					Abrir Modal de Cancelación
				</Button>

				{cancelledId && (
					<div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-md">
						<p className="text-green-800">
							Negocio {cancelledId} cancelado exitosamente
						</p>
					</div>
				)}

				<CancelBusinessModal
					open={open}
					onOpenChange={setOpen}
					businessId="12345"
					onConfirm={(reason) => {
						console.log('Cancel reason:', reason)
						setCancelledId('12345')
						setOpen(false)
					}}
					onCancel={() => {
						console.log('Cancel clicked')
					}}
				/>
			</div>
		)
	},
}

export const WithLongBusinessId: Story = {
	render: () => {
		const [open, setOpen] = useState(false)

		return (
			<div className="space-y-4">
				<Button onClick={() => setOpen(true)}>Cancelar Negocio Largo</Button>

				<CancelBusinessModal
					open={open}
					onOpenChange={setOpen}
					businessId="BUS2024-001234567"
					onConfirm={(reason) => {
						console.log('Cancel reason:', reason)
						alert(`Negocio cancelado con motivo: ${reason}`)
					}}
				/>
			</div>
		)
	},
}

export const DisabledConfirm: Story = {
	render: () => {
		const [open, setOpen] = useState(false)

		return (
			<div className="space-y-4">
				<p className="text-sm text-gray-600">
					El botón Confirmar está deshabilitado hasta que se ingrese texto
				</p>
				<Button onClick={() => setOpen(true)}>Abrir Modal (Vacíbox)</Button>

				<CancelBusinessModal
					open={open}
					onOpenChange={setOpen}
					businessId="00001"
					onConfirm={(reason) => {
						console.log('Cancel reason:', reason)
					}}
				/>
			</div>
		)
	},
}

export const WithLongText: Story = {
	render: () => {
		const [open, setOpen] = useState(false)

		return (
			<div className="space-y-4">
				<Button onClick={() => setOpen(true)}>Probar con Texto Largo</Button>

				<CancelBusinessModal
					open={open}
					onOpenChange={setOpen}
					businessId="99999"
					onConfirm={(reason) => {
						console.log('Cancel reason (length):', reason.length)
					}}
				/>
			</div>
		)
	},
}
