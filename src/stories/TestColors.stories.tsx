import type { Meta, StoryObj } from '@storybook/nextjs'
import { ThemeProvider } from '../hooks/use-theme'

const meta: Meta = {
	title: 'Test/Colors',
	parameters: {
		layout: 'centered',
	},
	decorators: [
		(Story) => (
			<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
				<div className="p-8">
					<Story />
				</div>
			</ThemeProvider>
		),
	],
}

export default meta
type Story = StoryObj<typeof meta>

export const CSSVariables: Story = {
	render: () => (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold mb-4">Test de Variables CSS</h2>

			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Variables CSS Directas:</h3>
				<div
					className="p-4 rounded"
					style={{
						backgroundColor: 'hsl(var(--primary))',
						color: 'hsl(var(--primary-foreground))',
					}}
				>
					Botón con estilos inline (hsl(var(--primary)))
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Clases Tailwind:</h3>
				<div className="bg-primary text-primary-foreground p-4 rounded">
					Botón con clases Tailwind (bg-primary)
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Colores Hardcoded:</h3>
				<div
					className="p-4 rounded"
					style={{
						backgroundColor: '#00505C',
						color: 'white',
					}}
				>
					Botón con colores hardcoded (#00505C)
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Inspección de Variables:</h3>
				<div className="text-sm space-y-1">
					<div>
						--primary:{' '}
						<span className="font-mono">
							{getComputedStyle(document.documentElement).getPropertyValue(
								'--primary'
							)}
						</span>
					</div>
					<div>
						--secondary:{' '}
						<span className="font-mono">
							{getComputedStyle(document.documentElement).getPropertyValue(
								'--secondary'
							)}
						</span>
					</div>
					<div>
						--background:{' '}
						<span className="font-mono">
							{getComputedStyle(document.documentElement).getPropertyValue(
								'--background'
							)}
						</span>
					</div>
				</div>
			</div>
		</div>
	),
}
