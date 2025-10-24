import type { Meta, StoryObj } from '@storybook/nextjs'
import { Header } from '../components/ui/header'

const meta: Meta<typeof Header> = {
  title: 'UI/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Componente Header con navegación, búsqueda, notificaciones y menú de usuario. Incluye breadcrumbs y es completamente accesible según WCAG AA.'
      }
    }
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Título principal del header'
    },
    subtitle: {
      control: 'text',
      description: 'Subtítulo opcional'
    },
    showSearch: {
      control: 'boolean',
      description: 'Mostrar campo de búsqueda'
    },
    showNotifications: {
      control: 'boolean',
      description: 'Mostrar icono de notificaciones'
    },
    showUserMenu: {
      control: 'boolean',
      description: 'Mostrar menú de usuario'
    },
    showBreadcrumbs: {
      control: 'boolean',
      description: 'Mostrar breadcrumbs'
    },
    notifications: {
      control: 'number',
      description: 'Número de notificaciones'
    }
  }
}

export default meta
type Story = StoryObj<typeof Header>

export const Default: Story = {
  args: {
    title: 'Financieramente',
    subtitle: 'Plataforma de Liquidación de Comisiones',
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
    showBreadcrumbs: true,
    notifications: 3,
    user: {
      name: 'Andrés Agudelo',
      email: 'andres.agudelo@financieramentecu.com',
      initials: 'AA'
    },
    breadcrumbs: [
      { label: 'Inicio', href: '/' },
      { label: 'Comisiones', href: '/comisiones' },
      { label: 'Liquidación', isCurrentPage: true }
    ]
  }
}

export const Minimal: Story = {
  args: {
    title: 'Financieramente',
    showSearch: false,
    showNotifications: false,
    showUserMenu: false,
    showBreadcrumbs: false
  }
}

export const WithSearch: Story = {
  args: {
    title: 'Dashboard',
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
    showBreadcrumbs: false,
    notifications: 0,
    user: {
      name: 'Usuario Demo',
      email: 'demo@financieramente.com',
      initials: 'UD'
    }
  }
}

export const WithBreadcrumbs: Story = {
  args: {
    title: 'Configuración',
    showSearch: false,
    showNotifications: true,
    showUserMenu: true,
    showBreadcrumbs: true,
    notifications: 1,
    user: {
      name: 'Admin User',
      email: 'admin@financieramente.com',
      initials: 'AU'
    },
    breadcrumbs: [
      { label: 'Inicio', href: '/' },
      { label: 'Configuración', href: '/config' },
      { label: 'Usuarios', href: '/config/users' },
      { label: 'Editar Usuario', isCurrentPage: true }
    ]
  }
}

export const WithNotifications: Story = {
  args: {
    title: 'Notificaciones',
    subtitle: 'Centro de alertas',
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
    showBreadcrumbs: true,
    notifications: 15,
    user: {
      name: 'María González',
      email: 'maria.gonzalez@financieramente.com',
      initials: 'MG'
    },
    breadcrumbs: [
      { label: 'Inicio', href: '/' },
      { label: 'Notificaciones', isCurrentPage: true }
    ]
  }
}

export const MobileView: Story = {
  args: {
    title: 'Financieramente',
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
    showBreadcrumbs: true,
    notifications: 2,
    user: {
      name: 'Test User',
      email: 'test@financieramente.com',
      initials: 'TU'
    },
    breadcrumbs: [
      { label: 'Inicio', href: '/' },
      { label: 'Móvil', isCurrentPage: true }
    ]
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  }
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Header Completo</h3>
        <Header
          title="Financieramente"
          subtitle="Plataforma de Liquidación de Comisiones"
          showSearch={true}
          showNotifications={true}
          showUserMenu={true}
          showBreadcrumbs={true}
          notifications={5}
          user={{
            name: 'Andrés Agudelo',
            email: 'andres.agudelo@financieramentecu.com',
            initials: 'AA'
          }}
          breadcrumbs={[
            { label: 'Inicio', href: '/' },
            { label: 'Comisiones', href: '/comisiones' },
            { label: 'Liquidación', isCurrentPage: true }
          ]}
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Header Mínimo</h3>
        <Header
          title="Financieramente"
          showSearch={false}
          showNotifications={false}
          showUserMenu={false}
          showBreadcrumbs={false}
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Solo Búsqueda</h3>
        <Header
          title="Búsqueda"
          showSearch={true}
          showNotifications={false}
          showUserMenu={false}
          showBreadcrumbs={false}
        />
      </div>
    </div>
  )
}
