import { StatsData, Business } from '@/types/business'

// Datos específicos del diseño para las estadísticas
export const mockNegociosStatsData: StatsData[] = [
  {
    title: 'Resumen Negocios Efectuados',
    value: '635',
    change: 21.01,
    trend: 'up',
    description: 'Negocios efectuados este período'
  },
  {
    title: 'Total Negocios Emitidos',
    value: '325k',
    change: 18.34,
    trend: 'up',
    description: 'Total de negocios emitidos'
  }
]

// Datos específicos del diseño para la tabla de negocios
export const mockNegociosBusinessData: Business[] = [
  {
    id: '20462',
    identification: '1060',
    user: {
      avatar: '/avatars/hat-user.jpg',
      name: 'Hat'
    },
    email: 'john.agude...',
    termPeriod: '24/3',
    date: '2022-06-13',
    value: 400950,
    product: 'Transfer Bank',
    status: 'Iniciado'
  },
  {
    id: '34304',
    identification: '1063',
    user: {
      avatar: '/avatars/bag-user.jpg',
      name: 'Bag'
    },
    email: 'Andres.ag...',
    termPeriod: '44/1',
    date: '2022-09-06',
    value: 899060,
    product: 'Transfer Bank',
    status: 'Venta Descuento'
  },
  {
    id: '20463',
    identification: '1061',
    user: {
      avatar: '/avatars/user3.jpg',
      name: 'María López'
    },
    email: 'maria.lopez...',
    termPeriod: '12/6',
    date: '2022-07-15',
    value: 250000,
    product: 'Transfer Bank',
    status: 'Emitido'
  },
  {
    id: '20464',
    identification: '1062',
    user: {
      avatar: '/avatars/user4.jpg',
      name: 'Carlos Ruiz'
    },
    email: 'carlos.ruiz...',
    termPeriod: '36/2',
    date: '2022-08-22',
    value: 750000,
    product: 'Transfer Bank',
    status: 'Iniciado'
  },
  {
    id: '20465',
    identification: '1064',
    user: {
      avatar: '/avatars/user5.jpg',
      name: 'Ana García'
    },
    email: 'ana.garcia...',
    termPeriod: '18/4',
    date: '2022-09-01',
    value: 320000,
    product: 'Transfer Bank',
    status: 'Venta Descuento'
  }
]

// Datos para el dropdown de búsqueda
export const searchTypeOptions = [
  { value: 'agent', label: 'Nombre del agente' },
  { value: 'client', label: 'Nombre del cliente' },
  { value: 'id', label: 'Cédula del cliente' }
]

// Datos para los avatares de usuarios
export const userAvatars = [
  { name: 'V', color: 'bg-blue-500' },
  { name: 'J', color: 'bg-amber-500' }
]
