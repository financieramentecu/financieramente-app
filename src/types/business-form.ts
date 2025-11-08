import { z } from 'zod'

// Esquema de validación con Zod
export const businessFormSchema = z.object({
  // Información básica y general del cliente
  email: z.string().email("Email inválido"),
  nombres: z.string().min(2, "Los nombres son obligatorios").trim(),
  apellidos: z.string().min(2, "Los apellidos son obligatorios").trim(),
  contacto: z
    .string()
    .regex(/^[0-9\s\-+]+$/, "Formato de contacto inválido")
    .optional(),
  numeroDocumento: z
    .string()
    .min(1, "El número de documento es obligatorio")
    .min(5, "El número de documento debe tener al menos 5 caracteres")
    .regex(/^[0-9.]+$/, "El número de documento solo puede contener números y puntos"),

  // Información del producto
  compania: z.string().min(1, "La compañía es obligatoria"),
  producto: z.string().min(1, "El producto es obligatorio"),
  plazo: z
    .number()
    .min(1, "El plazo debe ser mayor a 0")
    .max(1200, "El plazo no puede ser mayor a 1200 meses"),

  // Información del negocio
  moneda: z.string().min(1, "La moneda es obligatoria"),
  perioricidad: z.string().min(1, "La periodicidad es obligatoria"),
  valor: z.number().min(0, "El valor debe ser mayor o igual a 0"),
  agente: z.string().min(1, "El agente es obligatorio"),
})

export type BusinessFormData = z.infer<typeof businessFormSchema>

// Opciones para los selectores
