import type { Meta, StoryObj } from "@storybook/nextjs"
import { FormHeaderCard } from "@/components/negocios/crear-negocio/FormHeaderCard"

const meta: Meta<typeof FormHeaderCard> = {
  title: "Components/FormHeaderCard",
  component: FormHeaderCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof FormHeaderCard>

export const Default: Story = {
  args: {},
}

