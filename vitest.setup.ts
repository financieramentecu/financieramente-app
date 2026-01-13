import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import React from 'react'

// Agregar alias global de jest para compatibilidad
;(global as Record<string, unknown>).jest = vi

// IMPORTANTE: Los mocks de Next.js y NextAuth deben estar ANTES de cualquier importación
// Mock de next/server para evitar errores con NextAuth
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
		redirect: vi.fn((url) => ({
			url,
			status: 307,
		})),
	},
	NextRequest: class NextRequest {
		url = 'http://localhost:3000'
		nextUrl = new URL('http://localhost:3000')
	},
}))

// Mock de @/auth para evitar que NextAuth intente cargar módulos de Next.js
vi.mock('@/auth', () => ({
	auth: vi.fn(() => Promise.resolve(null)),
}))

// Mock de @/app/api/auth/[...nextauth]/route para evitar cargar NextAuth completo
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
	auth: vi.fn(() => Promise.resolve(null)),
	signIn: vi.fn(),
	signOut: vi.fn(),
}))

// Mock de ResizeObserver para evitar errores en tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}))

// Mock de scrollIntoView para evitar errores en tests
Element.prototype.scrollIntoView = vi.fn()

// Mock de hasPointerCapture para Radix UI Select
if (typeof Element.prototype.hasPointerCapture === 'undefined') {
	Element.prototype.hasPointerCapture = vi.fn(() => false)
}
if (typeof Element.prototype.setPointerCapture === 'undefined') {
	Element.prototype.setPointerCapture = vi.fn()
}
if (typeof Element.prototype.releasePointerCapture === 'undefined') {
	Element.prototype.releasePointerCapture = vi.fn()
}

// Mock de next/navigation
vi.mock('next/navigation', () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	})),
	usePathname: vi.fn(() => '/'),
	useSearchParams: vi.fn(() => new URLSearchParams()),
	redirect: vi.fn(),
	notFound: vi.fn(),
}))

// Mock de next/image
vi.mock('next/image', () => ({
	default: (props: Record<string, unknown>) => {
		return React.createElement('img', props)
	},
}))

// Mock de next/link
vi.mock('next/link', () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode
		href: string
	}) => {
		return React.createElement('a', { href }, children)
	},
}))

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})
