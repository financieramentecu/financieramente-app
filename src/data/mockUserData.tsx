import { User, NavItem } from '@/types/user'

export const mockCurrentUser: User = {
	id: '1',
	name: 'Juan A',
	email: 'juan.a@financieramente.com',
	avatar: '/avatars/juan-a.jpg',
	role: 'Administrador',
}

export const mockNavItems: NavItem[] = [
	{
		label: 'Negocio',
		href: '/negocio',
		icon: null, // Se asignará en el componente
		isActive: true,
	},
	{
		label: 'Distribución',
		href: '/distribucion',
		icon: null,
		isActive: false,
	},
	{
		label: 'Pre-liquidación',
		href: '/preliquidacion',
		icon: null,
		isActive: false,
	},
	{
		label: 'Liquidación',
		href: '/liquidacion',
		icon: null,
		isActive: false,
	},
]

export const mockUserProfile = {
	name: 'Juan A',
	email: 'juan.a@financieramente.com',
	avatar: '/avatars/juan-a.jpg',
	role: 'Administrador',
	lastLogin: '2024-01-20T10:30:00Z',
}
