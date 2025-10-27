import type { Meta, StoryObj } from "@storybook/nextjs"
import { StepIndicator } from "@/components/ui/StepIndicator"

const meta: Meta<typeof StepIndicator> = {
  title: "Components/StepIndicator",
  component: StepIndicator,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof StepIndicator>

const steps = [
  { id: "1", label: "Información" },
  { id: "2", label: "Producto" },
  { id: "3", label: "Negocio" },
  { id: "4", label: "Confirmación" },
]

export const FirstStep: Story = {
  args: {
    steps,
    currentStep: 1,
  },
}

export const SecondStep: Story = {
  args: {
    steps,
    currentStep: 2,
  },
}

export const ThirdStep: Story = {
  args: {
    steps,
    currentStep: 3,
  },
}

export const LastStep: Story = {
  args: {
    steps,
    currentStep: 4,
  },
}

export const WithoutLabels: Story = {
  args: {
    steps: [
      { id: "1", label: "" },
      { id: "2", label: "" },
      { id: "3", label: "" },
    ],
    currentStep: 2,
  },
}

