import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '../header'

const mockUser = {
  name: 'Test User',
  email: 'test@financieramente.com',
  initials: 'TU'
}

const mockBreadcrumbs = [
  { label: 'Inicio', href: '/' },
  { label: 'Comisiones', href: '/comisiones' },
  { label: 'Liquidación', isCurrentPage: true }
]

describe('Header Component', () => {
  it('renders with title and subtitle', () => {
    render(
      <Header
        title="Test Title"
        subtitle="Test Subtitle"
        showSearch={false}
        showNotifications={false}
        showUserMenu={false}
        showBreadcrumbs={false}
      />
    )
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument()
  })

  it('renders search input when showSearch is true', () => {
    render(
      <Header
        title="Test"
        showSearch={true}
        showNotifications={false}
        showUserMenu={false}
        showBreadcrumbs={false}
      />
    )
    
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument()
  })

  it('renders notifications button when showNotifications is true', () => {
    render(
      <Header
        title="Test"
        showSearch={false}
        showNotifications={true}
        showUserMenu={false}
        showBreadcrumbs={false}
        notifications={5}
      />
    )
    
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders user menu when showUserMenu is true', () => {
    render(
      <Header
        title="Test"
        showSearch={false}
        showNotifications={false}
        showUserMenu={true}
        showBreadcrumbs={false}
        user={mockUser}
      />
    )
    
    expect(screen.getByText('TU')).toBeInTheDocument()
  })

  it('renders breadcrumbs when showBreadcrumbs is true', () => {
    render(
      <Header
        title="Test"
        showSearch={false}
        showNotifications={false}
        showUserMenu={false}
        showBreadcrumbs={true}
        breadcrumbs={mockBreadcrumbs}
      />
    )
    
    expect(screen.getByText('Inicio')).toBeInTheDocument()
    expect(screen.getByText('Comisiones')).toBeInTheDocument()
    expect(screen.getByText('Liquidación')).toBeInTheDocument()
  })

  it('handles search input changes', () => {
    const mockOnSearch = jest.fn()
    render(
      <Header
        title="Test"
        showSearch={true}
        showNotifications={false}
        showUserMenu={false}
        showBreadcrumbs={false}
        onSearch={mockOnSearch}
      />
    )
    
    const searchInput = screen.getByPlaceholderText('Buscar...')
    fireEvent.change(searchInput, { target: { value: 'test query' } })
    fireEvent.submit(searchInput.closest('form')!)
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query')
  })

  it('handles menu button click', () => {
    const mockOnMenuClick = jest.fn()
    render(
      <Header
        title="Test"
        showSearch={false}
        showNotifications={false}
        showUserMenu={false}
        showBreadcrumbs={false}
        onMenuClick={mockOnMenuClick}
      />
    )
    
    const menuButton = screen.getByRole('button', { name: /abrir menú/i })
    fireEvent.click(menuButton)
    
    expect(mockOnMenuClick).toHaveBeenCalled()
  })

  it('handles notification button click', () => {
    const mockOnNotificationClick = jest.fn()
    render(
      <Header
        title="Test"
        showSearch={false}
        showNotifications={true}
        showUserMenu={false}
        showBreadcrumbs={false}
        notifications={3}
        onNotificationClick={mockOnNotificationClick}
      />
    )
    
    const notificationButton = screen.getByRole('button', { name: /notificaciones/i })
    fireEvent.click(notificationButton)
    
    expect(mockOnNotificationClick).toHaveBeenCalled()
  })

  it('handles user menu actions', () => {
    const mockOnUserAction = jest.fn()
    render(
      <Header
        title="Test"
        showSearch={false}
        showNotifications={false}
        showUserMenu={true}
        showBreadcrumbs={false}
        user={mockUser}
        onUserAction={mockOnUserAction}
      />
    )
    
    const userButton = screen.getByRole('button')
    fireEvent.click(userButton)
    
    const profileButton = screen.getByText('Perfil')
    fireEvent.click(profileButton)
    
    expect(mockOnUserAction).toHaveBeenCalledWith('profile')
  })

  it('shows correct notification count', () => {
    render(
      <Header
        title="Test"
        showSearch={false}
        showNotifications={true}
        showUserMenu={false}
        showBreadcrumbs={false}
        notifications={99}
      />
    )
    
    expect(screen.getByText('99')).toBeInTheDocument()
  })

  it('shows 99+ for notifications over 99', () => {
    render(
      <Header
        title="Test"
        showSearch={false}
        showNotifications={true}
        showUserMenu={false}
        showBreadcrumbs={false}
        notifications={150}
      />
    )
    
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('renders without notifications badge when count is 0', () => {
    render(
      <Header
        title="Test"
        showSearch={false}
        showNotifications={true}
        showUserMenu={false}
        showBreadcrumbs={false}
        notifications={0}
      />
    )
    
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('applies correct CSS classes', () => {
    const { container } = render(
      <Header
        title="Test"
        showSearch={false}
        showNotifications={false}
        showUserMenu={false}
        showBreadcrumbs={false}
        className="custom-class"
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
