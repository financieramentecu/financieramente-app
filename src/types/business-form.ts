import { z } from 'zod'

// Esquema de validación con Zod
export const businessFormSchema = z.object({
  // Información básica y general del cliente
  email: z.string().email('Email inválido'),
  nombres: z.string().min(2, 'Los nombres son obligatorios').trim(),
  apellidos: z.string().min(2, 'Los apellidos son obligatorios').trim(),
  contacto: z.string().regex(/^[0-9\s\-+]+$/, 'Formato de contacto inválido').optional(),
  numeroDocumento: z.string()
    .min(5, 'El número de documento es obligatorio')
    .regex(/^[0-9.]+$/, 'Formato de documento inválido'),
  
  // Información del producto
  compania: z.string().min(1, 'La compañía es obligatoria'),
  producto: z.string().min(1, 'El producto es obligatorio'),
  plazo: z.number().min(1, 'El plazo debe ser mayor a 0').max(1200, 'El plazo no puede ser mayor a 1200 meses'),
  
  // Información del negocio
  moneda: z.enum(['USD', 'COP', 'EUR'], {
    required_error: 'La moneda es obligatoria'
  }),
  perioricidad: z.string().min(1, 'La periodicidad es obligatoria'),
  valor: z.number().min(0, 'El valor debe ser mayor o igual a 0'),
  agente: z.string().min(1, 'El agente es obligatorio'),
})

export type BusinessFormData = z.infer<typeof businessFormSchema>

// Opciones para los selectores
export const companies = [
  { value: 'skandia', label: 'Skandia' },
  { value: 'suramericana', label: 'Suramericana' },
  { value: 'compensar', label: 'Compensar' },
  { value: 'seguros-bolivar', label: 'Seguros Bolívar' },
]

export const products = [
  { value: 'crea-patrimonio', label: 'Crea Patrimonio' },
  { value: 'seguro-vida', label: 'Seguro de Vida' },
  { value: 'seguro-vehicular', label: 'Seguro Vehicular' },
  { value: 'seguro-hogar', label: 'Seguro Hogar' },
]

export const periodicities = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
]

export const agents = [
  { value: 'agent1', label: 'Agente 1' },
  { value: 'agent2', label: 'Agente 2' },
  { value: 'agent3', label: 'Agente 3' },
]

