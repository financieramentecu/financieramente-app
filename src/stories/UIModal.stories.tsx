import type { Meta, StoryObj } from '@storybook/nextjs'
import { Modal, AlertModal, ConfirmModal, FormModal } from '../components/ui/modal'
import { Button } from '../components/ui/button'
import { useState } from 'react'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Sistema completo de modales con variantes para alertas, confirmaciones y formularios. Cumple con estándares WCAG AA de accesibilidad.'
      }
    }
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Título del modal'
    },
    description: {
      control: 'text',
      description: 'Descripción del modal'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
      description: 'Tamaño del modal'
    },
    variant: {
      control: 'select',
      options: ['default', 'alert', 'confirm', 'form'],
      description: 'Variante del modal'
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Mostrar botón de cerrar'
    },
    closeOnOverlayClick: {
      control: 'boolean',
      description: 'Cerrar al hacer clic fuera del modal'
    },
    closeOnEscape: {
      control: 'boolean',
      description: 'Cerrar con tecla Escape'
    }
  }
}

export default meta
type Story = StoryObj<typeof Modal>

export const Default: Story = {
  args: {
    title: 'Modal de Ejemplo',
    description: 'Este es un modal básico con título y descripción.',
    size: 'md',
    variant: 'default',
    showCloseButton: true,
    closeOnOverlayClick: true,
    closeOnEscape: true,
    children: (
      <div className="py-4">
        <p className="text-sm text-muted-foreground">
          Contenido del modal. Puede incluir cualquier elemento React.
        </p>
      </div>
    )
  },
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <Modal {...args} open={open} onOpenChange={setOpen} trigger={
        <Button onClick={() => setOpen(true)}>Abrir Modal</Button>
      }>
        {args.children}
      </Modal>
    )
  }
}

export const Small: Story = {
  args: {
    title: 'Modal Pequeño',
    description: 'Modal con tamaño pequeño.',
    size: 'sm',
    children: (
      <div className="py-4">
        <p className="text-sm">Contenido del modal pequeño.</p>
      </div>
    )
  },
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <Modal {...args} open={open} onOpenChange={setOpen} trigger={
        <Button onClick={() => setOpen(true)}>Abrir Modal Pequeño</Button>
      }>
        {args.children}
      </Modal>
    )
  }
}

export const Large: Story = {
  args: {
    title: 'Modal Grande',
    description: 'Modal con tamaño grande para contenido extenso.',
    size: 'lg',
    children: (
      <div className="py-4 space-y-4">
        <p className="text-sm">Este es un modal grande que puede contener más información.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h4 className="font-medium mb-2">Sección 1</h4>
            <p className="text-sm text-muted-foreground">Contenido de la primera sección.</p>
          </div>
          <div className="p-4 border rounded">
            <h4 className="font-medium mb-2">Sección 2</h4>
            <p className="text-sm text-muted-foreground">Contenido de la segunda sección.</p>
          </div>
        </div>
      </div>
    )
  },
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <Modal {...args} open={open} onOpenChange={setOpen} trigger={
        <Button onClick={() => setOpen(true)}>Abrir Modal Grande</Button>
      }>
        {args.children}
      </Modal>
    )
  }
}

export const WithoutCloseButton: Story = {
  args: {
    title: 'Sin Botón de Cerrar',
    description: 'Este modal no tiene botón de cerrar visible.',
    showCloseButton: false,
    children: (
      <div className="py-4">
        <p className="text-sm">Solo se puede cerrar haciendo clic fuera del modal o presionando Escape.</p>
      </div>
    )
  },
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <Modal {...args} open={open} onOpenChange={setOpen} trigger={
        <Button onClick={() => setOpen(true)}>Abrir Modal Sin Botón Cerrar</Button>
      }>
        {args.children}
      </Modal>
    )
  }
}

// Stories para AlertModal
export const AlertInfo: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <AlertModal
        open={open}
        onOpenChange={setOpen}
        type="info"
        message="Esta es una alerta informativa para el usuario."
        confirmText="Entendido"
        onConfirm={() => setOpen(false)}
        trigger={<Button onClick={() => setOpen(true)}>Mostrar Alerta Info</Button>}
      />
    )
  }
}

export const AlertSuccess: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <AlertModal
        open={open}
        onOpenChange={setOpen}
        type="success"
        message="¡Operación completada exitosamente!"
        confirmText="Continuar"
        onConfirm={() => setOpen(false)}
        trigger={<Button onClick={() => setOpen(true)}>Mostrar Alerta Éxito</Button>}
      />
    )
  }
}

export const AlertWarning: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <AlertModal
        open={open}
        onOpenChange={setOpen}
        type="warning"
        message="Advertencia: Esta acción puede tener consecuencias no deseadas."
        confirmText="Proceder"
        onConfirm={() => setOpen(false)}
        trigger={<Button onClick={() => setOpen(true)}>Mostrar Alerta Advertencia</Button>}
      />
    )
  }
}

export const AlertError: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <AlertModal
        open={open}
        onOpenChange={setOpen}
        type="error"
        message="Error: No se pudo completar la operación solicitada."
        confirmText="Reintentar"
        onConfirm={() => setOpen(false)}
        trigger={<Button onClick={() => setOpen(true)}>Mostrar Alerta Error</Button>}
      />
    )
  }
}

// Stories para ConfirmModal
export const ConfirmDefault: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        message="¿Estás seguro de que deseas continuar con esta acción?"
        confirmText="Sí, continuar"
        cancelText="Cancelar"
        onConfirm={() => {
          console.log('Acción confirmada')
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
        trigger={<Button onClick={() => setOpen(true)}>Mostrar Confirmación</Button>}
      />
    )
  }
}

export const ConfirmDestructive: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        message="¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        destructive={true}
        onConfirm={() => {
          console.log('Elemento eliminado')
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
        trigger={<Button variant="destructive" onClick={() => setOpen(true)}>Eliminar Elemento</Button>}
      />
    )
  }
}

// Stories para FormModal
export const FormBasic: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <FormModal
        open={open}
        onOpenChange={setOpen}
        fields={[
          {
            name: 'name',
            label: 'Nombre',
            type: 'text',
            placeholder: 'Ingresa tu nombre',
            required: true
          },
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            placeholder: 'tu@email.com',
            required: true
          },
          {
            name: 'message',
            label: 'Mensaje',
            type: 'textarea',
            placeholder: 'Escribe tu mensaje aquí...',
            required: false
          }
        ]}
        onSubmit={(data) => {
          console.log('Datos del formulario:', data)
          setOpen(false)
        }}
        submitText="Enviar"
        cancelText="Cancelar"
        trigger={<Button onClick={() => setOpen(true)}>Abrir Formulario</Button>}
      />
    )
  }
}

export const FormAdvanced: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <FormModal
        open={open}
        onOpenChange={setOpen}
        fields={[
          {
            name: 'firstName',
            label: 'Nombre',
            type: 'text',
            placeholder: 'Nombre',
            required: true
          },
          {
            name: 'lastName',
            label: 'Apellido',
            type: 'text',
            placeholder: 'Apellido',
            required: true
          },
          {
            name: 'email',
            label: 'Correo Electrónico',
            type: 'email',
            placeholder: 'correo@ejemplo.com',
            required: true
          },
          {
            name: 'phone',
            label: 'Teléfono',
            type: 'text',
            placeholder: '+1 (555) 123-4567',
            required: false
          },
          {
            name: 'age',
            label: 'Edad',
            type: 'number',
            placeholder: '25',
            required: false
          },
          {
            name: 'bio',
            label: 'Biografía',
            type: 'textarea',
            placeholder: 'Cuéntanos sobre ti...',
            required: false
          }
        ]}
        onSubmit={(data) => {
          console.log('Datos del formulario avanzado:', data)
          setOpen(false)
        }}
        submitText="Guardar Perfil"
        cancelText="Descartar"
        trigger={<Button onClick={() => setOpen(true)}>Crear Perfil</Button>}
      />
    )
  }
}

export const AllVariants: Story = {
  render: () => {
    const [alertOpen, setAlertOpen] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={() => setModalOpen(true)}>
            Modal Básico
          </Button>
          <Button onClick={() => setAlertOpen(true)}>
            Alerta Info
          </Button>
          <Button onClick={() => setConfirmOpen(true)}>
            Confirmación
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            Formulario
          </Button>
        </div>

        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Modal de Ejemplo"
          description="Este es un modal básico"
        >
          <div className="py-4">
            <p className="text-sm">Contenido del modal básico.</p>
          </div>
        </Modal>

        <AlertModal
          open={alertOpen}
          onOpenChange={setAlertOpen}
          type="info"
          message="Esta es una alerta informativa."
          confirmText="Entendido"
          onConfirm={() => setAlertOpen(false)}
        />

        <ConfirmModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          message="¿Deseas continuar con esta acción?"
          confirmText="Sí"
          cancelText="No"
          onConfirm={() => {
            console.log('Confirmado')
            setConfirmOpen(false)
          }}
          onCancel={() => setConfirmOpen(false)}
        />

        <FormModal
          open={formOpen}
          onOpenChange={setFormOpen}
          fields={[
            {
              name: 'name',
              label: 'Nombre',
              type: 'text',
              required: true
            },
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              required: true
            }
          ]}
          onSubmit={(data) => {
            console.log('Formulario enviado:', data)
            setFormOpen(false)
          }}
        />
      </div>
    )
  }
}
