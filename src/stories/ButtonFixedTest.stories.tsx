import type { Meta, StoryObj } from '@storybook/nextjs'
import { ButtonFixed } from '../components/ui/button-fixed'
import { Button } from '../components/ui/button'
import { ThemeProvider } from '../hooks/use-theme'

const meta: Meta<typeof ButtonFixed> = {
  title: 'Debug/ButtonFixedTest',
  component: ButtonFixed,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="p-8 space-y-6">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Comparison: Story = {
  render: () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Comparación de Botones</h2>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Botón Original (con variables CSS):</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Botón Fixed (con estilos inline):</h3>
        <div className="flex flex-wrap gap-4">
          <ButtonFixed variant="default">Default</ButtonFixed>
          <ButtonFixed variant="secondary">Secondary</ButtonFixed>
          <ButtonFixed variant="destructive">Destructive</ButtonFixed>
          <ButtonFixed variant="outline">Outline</ButtonFixed>
          <ButtonFixed variant="ghost">Ghost</ButtonFixed>
          <ButtonFixed variant="link">Link</ButtonFixed>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tamaños:</h3>
        <div className="flex items-center gap-4">
          <ButtonFixed size="sm">Small</ButtonFixed>
          <ButtonFixed size="default">Default</ButtonFixed>
          <ButtonFixed size="lg">Large</ButtonFixed>
          <ButtonFixed size="icon">⚙</ButtonFixed>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Colores Esperados:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="font-semibold">Default:</div>
            <div className="bg-[#00505C] text-white p-2 rounded">Fondo: #00505C (Verde oscuro)</div>
            <div className="text-white bg-[#00505C] p-2 rounded">Texto: Blanco</div>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Secondary:</div>
            <div className="bg-[#83D874] text-[#00505C] p-2 rounded">Fondo: #83D874 (Verde claro)</div>
            <div className="text-[#00505C] bg-[#83D874] p-2 rounded">Texto: #00505C (Verde oscuro)</div>
          </div>
        </div>
      </div>
    </div>
  ),
}
