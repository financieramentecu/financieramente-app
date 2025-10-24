import type { Meta, StoryObj } from '@storybook/nextjs'
import { Button } from '../components/ui/button'
import { ThemeProvider } from '../hooks/use-theme'

const meta: Meta<typeof Button> = {
  title: 'Debug/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="p-8 space-y-4">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const DebugDefault: Story = {
  render: () => {
    // Función para obtener el valor de una variable CSS
    const getCSSVariable = (variable: string) => {
      if (typeof window !== 'undefined') {
        return getComputedStyle(document.documentElement).getPropertyValue(variable)
      }
      return 'N/A'
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Debug del Botón Default</h2>
        
        {/* Botón con clases Tailwind */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Con clases Tailwind:</h3>
          <Button>Button con Tailwind</Button>
        </div>

        {/* Botón con estilos inline */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Con estilos inline:</h3>
          <button 
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            style={{
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))'
            }}
          >
            Button con estilos inline
          </button>
        </div>

        {/* Botón con colores hardcoded */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Con colores hardcoded:</h3>
          <button 
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 h-10"
            style={{
              backgroundColor: '#00505C',
              color: 'white'
            }}
          >
            Button con colores hardcoded
          </button>
        </div>

        {/* Información de variables CSS */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Variables CSS actuales:</h3>
          <div className="text-sm space-y-1 font-mono bg-gray-100 p-4 rounded">
            <div>--primary: {getCSSVariable('--primary')}</div>
            <div>--primary-foreground: {getCSSVariable('--primary-foreground')}</div>
            <div>--background: {getCSSVariable('--background')}</div>
            <div>--foreground: {getCSSVariable('--foreground')}</div>
          </div>
        </div>

        {/* Test de clases específicas */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Test de clases individuales:</h3>
          <div className="space-y-2">
            <div className="bg-primary text-primary-foreground p-2 rounded">bg-primary text-primary-foreground</div>
            <div className="bg-secondary text-secondary-foreground p-2 rounded">bg-secondary text-secondary-foreground</div>
            <div className="bg-destructive text-destructive-foreground p-2 rounded">bg-destructive text-destructive-foreground</div>
          </div>
        </div>
      </div>
    )
  },
}
