import type { Meta, StoryObj } from '@storybook/nextjs'
import { ThemeProvider } from '../hooks/use-theme'

const meta: Meta = {
  title: 'Debug/ButtonFixed',
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

// Componente Button temporal con estilos inline
const ButtonFixed = ({ children, variant = 'default', size = 'default', ...props }: any) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
  
  const variantStyles = {
    default: {
      backgroundColor: '#00505C',
      color: 'white'
    },
    destructive: {
      backgroundColor: '#ef4444',
      color: 'white'
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#00505C',
      border: '1px solid #e5e7eb'
    },
    secondary: {
      backgroundColor: '#83D874',
      color: '#00505C'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#00505C'
    },
    link: {
      backgroundColor: 'transparent',
      color: '#00505C',
      textDecoration: 'underline'
    }
  }

  const sizeStyles = {
    default: { height: '2.5rem', padding: '0.5rem 1rem' },
    sm: { height: '2.25rem', padding: '0.25rem 0.75rem' },
    lg: { height: '2.75rem', padding: '0.5rem 2rem' },
    icon: { height: '2.5rem', width: '2.5rem', padding: '0' }
  }

  return (
    <button
      className={baseClasses}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size]
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export const Default: Story = {
  render: () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Botones con Estilos Inline</h2>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Variantes:</h3>
        <div className="flex flex-wrap gap-4">
          <ButtonFixed variant="default">Default</ButtonFixed>
          <ButtonFixed variant="destructive">Destructive</ButtonFixed>
          <ButtonFixed variant="outline">Outline</ButtonFixed>
          <ButtonFixed variant="secondary">Secondary</ButtonFixed>
          <ButtonFixed variant="ghost">Ghost</ButtonFixed>
          <ButtonFixed variant="link">Link</ButtonFixed>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Tamaños:</h3>
        <div className="flex items-center gap-4">
          <ButtonFixed size="sm">Small</ButtonFixed>
          <ButtonFixed size="default">Default</ButtonFixed>
          <ButtonFixed size="lg">Large</ButtonFixed>
          <ButtonFixed size="icon">⚙</ButtonFixed>
        </div>
      </div>
    </div>
  ),
}
