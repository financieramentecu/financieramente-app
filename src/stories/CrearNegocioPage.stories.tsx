import type { Meta, StoryObj } from "@storybook/nextjs"
import { CrearNegocioPage } from "@/components/negocios/crear-negocio/CrearNegocioPage"

const meta: Meta<typeof CrearNegocioPage> = {
  title: "Pages/CrearNegocioPage",
  component: CrearNegocioPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof CrearNegocioPage>

export const Default: Story = {
  args: {},
}

