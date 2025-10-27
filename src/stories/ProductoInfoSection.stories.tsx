import type { Meta, StoryObj } from "@storybook/nextjs"
import { ProductoInfoSection } from "@/components/negocios/crear-negocio/ProductoInfoSection"
import { initialFormData, productoOptions, companiaOptions } from "@/data/mockCrearNegocioData"

const meta: Meta<typeof ProductoInfoSection> = {
  title: "Components/CrearNegocio/ProductoInfoSection",
  component: ProductoInfoSection,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof ProductoInfoSection>

export const Default: Story = {
  args: {
    data: initialFormData.producto,
    onChange: (field, value) => console.log(`Field ${field} changed to ${value}`),
    productoOptions,
    companiaOptions,
  },
}

