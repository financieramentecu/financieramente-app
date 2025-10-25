import { Business } from '@/types/business'

export const mockBusinessList: Business[] = [
  {
    id: '1',
    identification: 'CC 12345678',
    user: {
      avatar: '/avatars/user1.jpg',
      name: 'María García'
    },
    email: 'maria.garcia@email.com',
    termPeriod: '12 meses',
    date: '2024-01-15',
    value: 15000000,
    product: 'Crédito Personal',
    status: 'Emitido'
  },
  {
    id: '2',
    identification: 'CC 87654321',
    user: {
      avatar: '/avatars/user2.jpg',
      name: 'Carlos López'
    },
    email: 'carlos.lopez@email.com',
    termPeriod: '24 meses',
    date: '2024-01-14',
    value: 25000000,
    product: 'Crédito Hipotecario',
    status: 'Venta Efectuado'
  },
  {
    id: '3',
    identification: 'CC 11223344',
    user: {
      avatar: '/avatars/user3.jpg',
      name: 'Ana Rodríguez'
    },
    email: 'ana.rodriguez@email.com',
    termPeriod: '18 meses',
    date: '2024-01-13',
    value: 18000000,
    product: 'Crédito Vehicular',
    status: 'Emitido'
  },
  {
    id: '4',
    identification: 'CC 55667788',
    user: {
      avatar: '/avatars/user4.jpg',
      name: 'Luis Martínez'
    },
    email: 'luis.martinez@email.com',
    termPeriod: '36 meses',
    date: '2024-01-12',
    value: 45000000,
    product: 'Crédito Comercial',
    status: 'Venta Efectuado'
  },
  {
    id: '5',
    identification: 'CC 99887766',
    user: {
      avatar: '/avatars/user5.jpg',
      name: 'Sofia Herrera'
    },
    email: 'sofia.herrera@email.com',
    termPeriod: '6 meses',
    date: '2024-01-11',
    value: 8000000,
    product: 'Crédito de Libre Inversión',
    status: 'Emitido'
  },
  {
    id: '6',
    identification: 'CC 33445566',
    user: {
      avatar: '/avatars/user6.jpg',
      name: 'Diego Torres'
    },
    email: 'diego.torres@email.com',
    termPeriod: '12 meses',
    date: '2024-01-10',
    value: 12000000,
    product: 'Crédito Personal',
    status: 'Venta Efectuado'
  }
]

export const mockBusinessStats = {
  totalBusinesses: 156,
  totalValue: 2845000000,
  averageValue: 18237179,
  completionRate: 78.5
}
