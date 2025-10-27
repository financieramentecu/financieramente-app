import type { Meta, StoryObj } from "@storybook/nextjs"
import { ValorNegocioSection } from "@/components/negocios/crear-negocio/ValorNegocioSection"
import { initialFormData } from "@/data/mockCrearNegocioData"

const meta: Meta<typeof ValorNegocioSection> = {
  title: "Components/CrearNegocio/ValorNegocioSection",
  component: ValorNegocioSection,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof ValorNegocioSection>

export const Default: Story = {
  args: {
    data: initialFormData.valor,
    onChange: (field, value) => console.log(`Field ${field} changed to ${value}`),
  },
}

