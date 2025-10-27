export interface ClienteInfo {
  documento: string
  nombres: string
  apellidos: string
  contacto: string
  email: string
}

export interface ProductoInfo {
  compañia: string
  plazo: string
  producto: string
  valor: string
}

export interface NegocioInfo {
  moneda: string
  agente: string
}

export interface ValorInfo {
  email: string
  agente: string
}

export interface CrearNegocioForm {
  cliente: ClienteInfo
  producto: ProductoInfo
  negocio: NegocioInfo
  valor: ValorInfo
}

export interface ProductoOption {
  value: string
  label: string
}

