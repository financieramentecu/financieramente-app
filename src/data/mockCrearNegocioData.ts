import type { CrearNegocioForm, ProductoOption } from "@/types/crearNegocio"

export const initialFormData: CrearNegocioForm = {
  cliente: {
    documento: "x.xx.x",
    nombres: "John Agudelo",
    apellidos: "Agente",
    contacto: "xxx xxx x",
    email: "email@gmail.com",
  },
  producto: {
    compañia: "",
    plazo: "10",
    producto: "",
    valor: "",
  },
  negocio: {
    moneda: "email@gmail.com",
    agente: "Agente",
  },
  valor: {
    email: "email@gmail.com",
    agente: "Agente",
  },
}

export const productoOptions: ProductoOption[] = [
  { value: "producto1", label: "Producto A" },
  { value: "producto2", label: "Producto B" },
  { value: "producto3", label: "Producto C" },
  { value: "producto4", label: "Producto D" },
]

export const companiaOptions: ProductoOption[] = [
  { value: "skandi", label: "Skandi" },
  { value: "activa", label: "Activa" },
  { value: "liberty", label: "Liberty Seguros" },
  { value: "sura", label: "Sura" },
  { value: "bolivar", label: "Bolívar Seguros" },
  { value: "continental", label: "Continental" },
  { value: "equidad", label: "Equidad Seguros" },
]

export const formSteps = [
  { id: "1", label: "Información" },
  { id: "2", label: "Producto" },
  { id: "3", label: "Negocio" },
  { id: "4", label: "Confirmación" },
]

