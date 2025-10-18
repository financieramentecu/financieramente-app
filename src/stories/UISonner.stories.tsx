import type { Meta, StoryObj } from '@storybook/nextjs'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'

const meta: Meta = {
  title: 'UI/Toast',
  component: () => null, // Sonner no necesita un componente wrapper
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Sistema de notificaciones emergentes con diferentes estados y duraciones. Utiliza Sonner para una experiencia moderna y accesible según WCAG AA.'
      }
    }
  }
}

export default meta
type Story = StoryObj

export const Success: Story = {
  render: () => (
    <Button
      onClick={() => toast.success("¡Operación completada exitosamente!", {
        description: "Los datos se han guardado correctamente.",
        duration: 4000,
      })}
    >
      Mostrar Toast de Éxito
    </Button>
  )
}

export const Error: Story = {
  render: () => (
    <Button
      onClick={() => toast.error("Error en la operación", {
        description: "No se pudo completar la acción solicitada.",
        duration: 5000,
      })}
    >
      Mostrar Toast de Error
    </Button>
  )
}

export const Warning: Story = {
  render: () => (
    <Button
      onClick={() => toast.warning("Advertencia", {
        description: "Esta acción puede tener consecuencias no deseadas.",
        duration: 4000,
      })}
    >
      Mostrar Toast de Advertencia
    </Button>
  )
}

export const Info: Story = {
  render: () => (
    <Button
      onClick={() => toast.info("Información", {
        description: "Nueva actualización disponible para tu aplicación.",
        duration: 4000,
      })}
    >
      Mostrar Toast de Información
    </Button>
  )
}

export const Loading: Story = {
  render: () => (
    <Button
      onClick={() => toast.loading("Procesando...", {
        description: "Por favor espera mientras procesamos tu solicitud.",
        duration: 3000,
      })}
    >
      Mostrar Toast de Carga
    </Button>
  )
}

export const WithAction: Story = {
  render: () => (
    <Button
      onClick={() => toast("Mensaje con acción", {
        description: "Este toast incluye botones de acción.",
        action: {
          label: "Deshacer",
          onClick: () => toast.success("Acción deshecha"),
        },
        cancel: {
          label: "Cerrar",
          onClick: () => toast.info("Toast cerrado"),
        },
        duration: 6000,
      })}
    >
      Mostrar Toast con Acción
    </Button>
  )
}

export const PromiseToast: Story = {
  render: () => (
    <Button
      onClick={() => {
        const promise = () => new Promise((resolve) => setTimeout(resolve, 2000))
        
        toast.promise(promise, {
          loading: 'Guardando datos...',
          success: 'Datos guardados exitosamente!',
          error: 'Error al guardar los datos.',
        })
      }}
    >
      Mostrar Toast de Promesa
    </Button>
  )
}

export const CustomDuration: Story = {
  render: () => (
    <div className="space-y-2">
      <Button
        onClick={() => toast("Toast de 2 segundos", {
          duration: 2000,
        })}
      >
        2 Segundos
      </Button>
      <Button
        onClick={() => toast("Toast de 10 segundos", {
          duration: 10000,
        })}
      >
        10 Segundos
      </Button>
      <Button
        onClick={() => toast("Toast persistente", {
          duration: Infinity,
        })}
      >
        Persistente
      </Button>
    </div>
  )
}

export const MultipleToasts: Story = {
  render: () => (
    <div className="space-y-2">
      <Button
        onClick={() => {
          toast.success("Primer toast")
          setTimeout(() => toast.info("Segundo toast"), 500)
          setTimeout(() => toast.warning("Tercer toast"), 1000)
        }}
      >
        Mostrar Múltiples Toasts
      </Button>
    </div>
  )
}

export const RichContent: Story = {
  render: () => (
    <Button
      onClick={() => toast("Toast con contenido rico", {
        description: (
          <div className="space-y-2">
            <p>Este toast incluye contenido HTML personalizado.</p>
            <div className="flex space-x-2">
              <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs">
                Etiqueta
              </span>
              <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                Otra etiqueta
              </span>
            </div>
          </div>
        ),
        duration: 5000,
      })}
    >
      Mostrar Toast con Contenido Rico
    </Button>
  )
}

export const PositionVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-2">
      <Button
        onClick={() => toast("Toast arriba-izquierda", {
          position: "top-left",
        })}
      >
        Arriba Izquierda
      </Button>
      <Button
        onClick={() => toast("Toast arriba-centro", {
          position: "top-center",
        })}
      >
        Arriba Centro
      </Button>
      <Button
        onClick={() => toast("Toast arriba-derecha", {
          position: "top-right",
        })}
      >
        Arriba Derecha
      </Button>
      <Button
        onClick={() => toast("Toast abajo-izquierda", {
          position: "bottom-left",
        })}
      >
        Abajo Izquierda
      </Button>
      <Button
        onClick={() => toast("Toast abajo-centro", {
          position: "bottom-center",
        })}
      >
        Abajo Centro
      </Button>
      <Button
        onClick={() => toast("Toast abajo-derecha", {
          position: "bottom-right",
        })}
      >
        Abajo Derecha
      </Button>
    </div>
  )
}

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => toast.success("Éxito", {
            description: "Operación completada exitosamente.",
          })}
        >
          Éxito
        </Button>
        <Button
          onClick={() => toast.error("Error", {
            description: "Error en la operación.",
          })}
        >
          Error
        </Button>
        <Button
          onClick={() => toast.warning("Advertencia", {
            description: "Advertencia importante.",
          })}
        >
          Advertencia
        </Button>
        <Button
          onClick={() => toast.info("Información", {
            description: "Información relevante.",
          })}
        >
          Información
        </Button>
      </div>
      
      <div className="space-y-2">
        <Button
          onClick={() => toast.loading("Cargando...", {
            description: "Procesando solicitud.",
          })}
        >
          Carga
        </Button>
        <Button
          onClick={() => toast("Mensaje personalizado", {
            description: "Toast con contenido personalizado.",
            action: {
              label: "Acción",
              onClick: () => toast.success("Acción ejecutada"),
            },
          })}
        >
          Con Acción
        </Button>
      </div>
    </div>
  )
}
