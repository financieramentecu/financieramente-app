import type { Meta, StoryObj } from "@storybook/nextjs"
import { NegocioInfoSection } from "@/components/negocios/crear-negocio/NegocioInfoSection"
import { initialFormData } from "@/data/mockCrearNegocioData"

const meta: Meta<typeof NegocioInfoSection> = {
  title: "Components/CrearNegocio/NegocioInfoSection",
  component: NegocioInfoSection,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof NegocioInfoSection>

export const Default: Story = {
  args: {
    data: initialFormData.negocio,
    onChange: (field, value) => console.log(`Field ${field} changed to ${value}`),
  },
}

