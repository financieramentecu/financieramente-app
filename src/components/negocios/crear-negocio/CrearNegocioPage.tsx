"use client"

import * as React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { StepIndicator } from "@/components/ui/StepIndicator"
import { FormHeaderCard } from "./FormHeaderCard"
import { ClienteInfoSection } from "./ClienteInfoSection"
import { ProductoInfoSection } from "./ProductoInfoSection"
import { NegocioInfoSection } from "./NegocioInfoSection"
import { ValorNegocioSection } from "./ValorNegocioSection"
import { initialFormData, productoOptions, companiaOptions, formSteps } from "@/data/mockCrearNegocioData"
import type { CrearNegocioForm } from "@/types/crearNegocio"

export interface CrearNegocioPageProps {
  className?: string
}

export function CrearNegocioPage({ className }: CrearNegocioPageProps) {
  const [formData, setFormData] = React.useState<CrearNegocioForm>(initialFormData)

  const handleClienteChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      cliente: { ...prev.cliente, [field]: value },
    }))
  }

  const handleProductoChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      producto: { ...prev.producto, [field]: value },
    }))
  }

  const handleNegocioChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      negocio: { ...prev.negocio, [field]: value },
    }))
  }

  const handleValorChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      valor: { ...prev.valor, [field]: value },
    }))
  }

  const handleCancel = () => {
    console.log("Cancelar clicked")
  }

  const handleSave = () => {
    console.log("Aceptar y Guardar clicked", formData)
  }

  return (
    <div className={`min-h-screen bg-white p-6 ${className || ""}`}>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/logos/logo-financiera.svg"
              alt="Financiera mente"
              width={350}
              height={87}
              priority
              className="h-auto w-48"
            />
          </div>
          <FormHeaderCard />
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={formSteps} currentStep={2} className="mb-8" />

        {/* Form Sections */}
        <div className="space-y-8">
          <ClienteInfoSection
            data={formData.cliente}
            onChange={handleClienteChange}
          />
          
          <ProductoInfoSection
            data={formData.producto}
            onChange={handleProductoChange}
            productoOptions={productoOptions}
            companiaOptions={companiaOptions}
          />
          
          <NegocioInfoSection
            data={formData.negocio}
            onChange={handleNegocioChange}
          />
          
          <ValorNegocioSection
            data={formData.valor}
            onChange={handleValorChange}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-teal-700 text-white hover:bg-teal-800"
          >
            Aceptar y Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}

