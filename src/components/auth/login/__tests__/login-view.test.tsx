import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoginView } from '../login-view'

// Mock de SocialSignIn
vi.mock('../social-sign-in', () => ({
  SocialSignIn: ({ providers }: { providers: any[] }) => (
    <div data-testid="social-sign-in">
      {providers.map((p) => (
        <button key={p.id} data-testid={`provider-${p.id}`}>
          {p.label}
        </button>
      ))}
    </div>
  ),
  GoogleIcon: () => <span>G</span>,
}))

// Mock de AuthCard
vi.mock('../auth-card', () => ({
  AuthCard: ({ title, highlight, children }: any) => (
    <div data-testid="auth-card">
      <h1>{title}{highlight}</h1>
      {children}
    </div>
  ),
}))

describe('LoginView', () => {
  it('debe renderizar el componente de login', () => {
    render(<LoginView />)
    
    expect(screen.getByTestId('auth-card')).toBeInTheDocument()
    expect(screen.getByTestId('social-sign-in')).toBeInTheDocument()
  })

  it('debe mostrar el botón de Google por defecto', () => {
    render(<LoginView />)
    
    expect(screen.getByTestId('provider-google')).toBeInTheDocument()
  })

  it('debe renderizar con proveedores personalizados', () => {
    const customProviders = [
      {
        id: 'google',
        label: 'Continuar con Google',
        icon: <span>G</span>,
      },
    ]

    render(<LoginView socialProviders={customProviders} />)
    
    expect(screen.getByTestId('provider-google')).toBeInTheDocument()
  })
})

