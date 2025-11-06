import type { BusinessFormData } from '@/types/business-form'

export const mockBusinessFormDefaultValues: Partial<BusinessFormData> = {
  email: '',
  nombres: '',
  apellidos: '',
  contacto: '',
  numeroDocumento: '',
  compania: '',
  producto: '',
  plazo: undefined,
  moneda: undefined,
  perioricidad: '',
  valor: undefined,
  agente: '',
}

export const mockBusinessFormFilled: BusinessFormData = {
  email: 'john.agudelo@gmail.com',
  nombres: 'John',
  apellidos: 'Agudelo',
  contacto: '+57 320 555 55 55',
  numeroDocumento: '1053.123.456',
  compania: 'skandia',
  producto: 'crea-patrimonio',
  plazo: 34,
  moneda: 'USD',
  perioricidad: 'mensual',
  valor: 400950,
  agente: 'Vanesa Cardona',
}

