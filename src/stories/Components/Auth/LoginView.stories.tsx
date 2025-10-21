import type { Meta, StoryObj } from "@storybook/nextjs"
import {
  GoogleIcon,
  LoginView,
  type LoginViewProps,
} from "@/components/auth/login"
import { ThemeProvider } from "@/hooks/use-theme"

const meta: Meta<typeof LoginView> = {
  title: "Components/Auth/LoginView",
  component: LoginView,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Pantalla de autenticación que combina formulario de ingreso por correo y proveedores sociales, siguiendo el look & feel de Financieramente.",
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="min-h-screen">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

const baseArgs: LoginViewProps = {
  emailForm: {
    placeholder: "name@example.com",
    submitLabel: "Ingresar con correo",
    onSubmit: async (email: string) => {
      await new Promise((resolve) => setTimeout(resolve, 600))
      console.log("Email submit", email)
    },
  },
  socialProviders: [
    {
      id: "google",
      label: "Google",
      icon: <GoogleIcon className="size-5" />,
      onClick: () => console.log("Google sign-in"),
    },
  ],
  termsLink: {
    label: "Términos y condiciones",
    href: "#",
  },
}

export const Default: Story = {
  args: baseArgs,
}

export const LoadingEmailSubmit: Story = {
  args: {
    ...baseArgs,
    emailForm: {
      ...baseArgs.emailForm,
      isSubmitting: true,
    },
  },
}

export const WithoutBrandPanel: Story = {
  args: {
    ...baseArgs,
    showBrandPanel: false,
    brand: {
      heading: "Financiera",
      highlight: "mente",
      footerLabel: "Financiera mente",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Versión solo con el formulario, útil para embeds o pantallas con espacio limitado.",
      },
    },
  },
}
