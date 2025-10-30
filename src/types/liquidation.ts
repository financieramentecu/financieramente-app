export interface LiquidationDetail {
  id: string
  status: 'Efectuada' | 'Pendiente' | 'Cancelada'
  amount: number
  currency: 'USD' | 'COP'
  
  // Client information
  client: {
    name: string
    identification: string
    identificationType: string
    avatar?: string
    status: 'activo' | 'inactivo'
    email: string
    contactNumber: string
  }
  
  // Agent information
  agent: {
    name: string
    role: string
    avatar?: string
    email: string
    contactNumber: string
  }
  
  // Insurance company
  insurance: {
    code: string
    name: string
    icon?: string
  }
  
  // Product details
  product: {
    name: string
    date: string
    term: number
    periodicity?: number
  }
}

