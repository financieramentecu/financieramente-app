import type { Meta, StoryObj } from "@storybook/nextjs"
import { ClienteInfoSection } from "@/components/negocios/crear-negocio/ClienteInfoSection"
import { initialFormData } from "@/data/mockCrearNegocioData"

const meta: Meta<typeof ClienteInfoSection> = {
  title: "Components/CrearNegocio/ClienteInfoSection",
  component: ClienteInfoSection,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof ClienteInfoSection>

export const Default: Story = {
  args: {
    data: initialFormData.cliente,
    onChange: (field, value) => console.log(`Field ${field} changed to ${value}`),
  },
}

