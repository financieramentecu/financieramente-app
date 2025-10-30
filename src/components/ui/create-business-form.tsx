"use client"

import * as React from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { businessFormSchema, type BusinessFormData } from "@/types/business-form"
import { companies, products, periodicities } from "@/types/business-form"

export interface CreateBusinessFormProps {
  onSubmit?: (data: BusinessFormData) => void | Promise<void>
  onCancel?: () => void
  defaultValues?: Partial<BusinessFormData>
}

export const CreateBusinessForm = React.forwardRef<
  HTMLFormElement,
  CreateBusinessFormProps
>(({ onSubmit, onCancel, defaultValues }, ref) => {
  const [numeroDocumento, setNumeroDocumento] = React.useState("")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      email: defaultValues?.email || "email@gmail.com",
      nombres: defaultValues?.nombres || "email@gmail.com",
      apellidos: defaultValues?.apellidos || "Agente",
      contacto: defaultValues?.contacto || "",
      numeroDocumento: defaultValues?.numeroDocumento || "",
      compania: defaultValues?.compania || "",
      producto: defaultValues?.producto || "",
      plazo: defaultValues?.plazo || 10,
      moneda: defaultValues?.moneda || "USD",
      perioricidad: defaultValues?.perioricidad || "Semestral",
      valor: defaultValues?.valor || 0,
      agente: defaultValues?.agente || "Agente",
    },
  })

  // Observar cambios en numeroDocumento
  const documentValue = watch("numeroDocumento")

  React.useEffect(() => {
    setNumeroDocumento(documentValue || "")
  }, [documentValue])

  // Determinar si los campos deben estar bloqueados
  const isBlocked = !numeroDocumento || numeroDocumento.length < 5

  const handleFormSubmit = async (data: BusinessFormData) => {
    try {
      await onSubmit?.(data)
    } catch (error) {
      console.error("Error submitting form:", error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        {/* Logo Financiera mente */}
        <div className="flex items-center gap-3">
          <Image
            src="/logos/logo-financiera.svg"
            alt="Financiera mente"
            width={140}
            height={35}
            className="h-auto w-auto"
          />
        </div>

        {/* Banner con Isologo */}
        <div className="bg-[#00505C] w-full sm:w-auto px-4 sm:px-8 py-4 rounded-lg flex items-center gap-4 sm:gap-6">
          <div className="w-1/2 sm:w-auto flex items-center justify-center">
            <Image
              src="/logos/isologo.svg"
              alt="Isologo"
              width={120}
              height={120}
              className="w-full sm:w-24 sm:h-24 h-auto object-contain"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <h1 className="text-[#83D874] font-bold text-base sm:text-lg">
              Formulario único de inscripción Nacional
            </h1>
            <p className="text-[#6BCA6F] text-sm sm:text-base">
              Formulario único de inscripción Nacional
            </p>
          </div>
        </div>
      </div>

      <form ref={ref} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Sección 1: Información básica y general del cliente */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-[#00505C]">Información básica y general del cliente</h3>
            <Separator className="bg-gray-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroDocumento" className="text-sm font-medium">
                No. Documento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="numeroDocumento"
                {...register("numeroDocumento")}
                placeholder="X.XXX.XXX"
                disabled={false}
                onChange={(e) => {
                  const value = e.target.value
                  setNumeroDocumento(value)
                  setValue("numeroDocumento", value, { shouldValidate: true })
                }}
                className={errors.numeroDocumento ? "border-red-500" : ""}
              />
              {errors.numeroDocumento && (
                <p className="text-xs text-red-500">{errors.numeroDocumento.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                {...register("email")}
                disabled={isBlocked}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombres" className="text-sm font-medium">
                Nombres
              </Label>
              <Input
                id="nombres"
                {...register("nombres")}
                disabled={isBlocked}
                className={errors.nombres ? "border-red-500" : ""}
              />
              {errors.nombres && (
                <p className="text-xs text-red-500">{errors.nombres.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacto" className="text-sm font-medium">
                Contacto
              </Label>
              <Input
                id="contacto"
                {...register("contacto")}
                placeholder="XXX XXX X"
                disabled={isBlocked}
                className={errors.contacto ? "border-red-500" : ""}
              />
              {errors.contacto && (
                <p className="text-xs text-red-500">{errors.contacto.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellidos" className="text-sm font-medium">
                Apellidos
              </Label>
              <Input
                id="apellidos"
                {...register("apellidos")}
                disabled={isBlocked}
                className={errors.apellidos ? "border-red-500" : ""}
              />
              {errors.apellidos && (
                <p className="text-xs text-red-500">{errors.apellidos.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sección 2: Información del producto */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-[#00505C]">Información del producto</h3>
            <Separator className="bg-gray-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="compania" className="text-sm font-medium">
                Compañía
              </Label>
              <Select
                disabled={isBlocked}
                onValueChange={(value) => setValue("compania", value, { shouldValidate: true })}
              >
                <SelectTrigger id="compania" className={errors.compania ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccione una compañía" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.value} value={company.value}>
                      {company.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.compania && (
                <p className="text-xs text-red-500">{errors.compania.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Si estas registrado a un negocio internacional elige el nombre del producto...
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="producto" className="text-sm font-medium">
                Producto
              </Label>
              <Select
                disabled={isBlocked}
                onValueChange={(value) => setValue("producto", value, { shouldValidate: true })}
              >
                <SelectTrigger id="producto" className={errors.producto ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccione un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.value} value={product.value}>
                      {product.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.producto && (
                <p className="text-xs text-red-500">{errors.producto.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plazo" className="text-sm font-medium">
                Plazo
              </Label>
              <Input
                id="plazo"
                type="number"
                {...register("plazo", { valueAsNumber: true })}
                disabled={isBlocked}
                className={errors.plazo ? "border-red-500" : ""}
              />
              {errors.plazo && (
                <p className="text-xs text-red-500">{errors.plazo.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sección 3: Información del negocio */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-[#00505C]">Información del negocio</h3>
            <Separator className="bg-gray-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="moneda" className="text-sm font-medium">
                Moneda
              </Label>
              <Input
                id="moneda"
                {...register("moneda")}
                disabled={isBlocked}
                className={errors.moneda ? "border-red-500" : ""}
              />
              {errors.moneda && (
                <p className="text-xs text-red-500">{errors.moneda.message}</p>
              )}
              
              <div className="mt-2">
                <p className="text-sm font-medium mb-2">Valor del negocio</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>1. Si el negocio es Crea Patrimonio de Skandia....</p>
                  <p>2. Si tu cliente toma......</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perioricidad" className="text-sm font-medium">
                Periodicidad
              </Label>
              <Select
                disabled={isBlocked}
                onValueChange={(value) => setValue("perioricidad", value, { shouldValidate: true })}
              >
                <SelectTrigger id="perioricidad" className={errors.perioricidad ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccione periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  {periodicities.map((periodicity) => (
                    <SelectItem key={periodicity.value} value={periodicity.value}>
                      {periodicity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.perioricidad && (
                <p className="text-xs text-red-500">{errors.perioricidad.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor" className="text-sm font-medium">
                Valor
              </Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                {...register("valor", { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isBlocked}
                className={errors.valor ? "border-red-500" : ""}
              />
              {errors.valor && (
                <p className="text-xs text-red-500">{errors.valor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="agente" className="text-sm font-medium">
                Agente
              </Label>
              <Input
                id="agente"
                {...register("agente")}
                disabled={isBlocked}
                className={errors.agente ? "border-red-500" : ""}
              />
              {errors.agente && (
                <p className="text-xs text-red-500">{errors.agente.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-[#00505C] hover:text-[#00505C] hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isBlocked}
            className="bg-[#00505C] hover:bg-[#003d47] text-white"
          >
            {isSubmitting ? "Guardando..." : "Aceptar y Guardar"}
          </Button>
        </div>
      </form>
    </div>
  )
})

CreateBusinessForm.displayName = "CreateBusinessForm"
