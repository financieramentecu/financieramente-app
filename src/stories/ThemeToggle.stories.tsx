import type { Meta, StoryObj } from '@storybook/nextjs'
import { ThemeToggle } from '../components/theme-toggle'
import { ThemeProvider } from '../hooks/use-theme'

const meta: Meta<typeof ThemeToggle> = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente para cambiar entre tema claro y oscuro del sistema Financieramente.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="p-4">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithCustomClass: Story = {
  args: {
    className: 'w-12 h-12',
  },
}

export const Large: Story = {
  args: {
    className: 'w-16 h-16 text-lg',
  },
}
