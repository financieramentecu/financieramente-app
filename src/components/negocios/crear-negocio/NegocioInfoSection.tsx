import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { NegocioInfo } from "@/types/crearNegocio"

export interface NegocioInfoSectionProps {
  data: NegocioInfo
  onChange: (field: keyof NegocioInfo, value: string) => void
  className?: string
}

export function NegocioInfoSection({
  data,
  onChange,
  className,
}: NegocioInfoSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <h2 className="text-lg font-bold text-teal-700">
        Información del negocio
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="moneda" className="text-sm text-gray-700">
            Moneda
          </Label>
          <Input
            id="moneda"
            value={data.moneda}
            onChange={(e) => onChange("moneda", e.target.value)}
            className="w-full border-gray-300"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agente" className="text-sm text-gray-700">
            Agente
          </Label>
          <Input
            id="agente"
            value={data.agente}
            onChange={(e) => onChange("agente", e.target.value)}
            className="w-full border-gray-300"
          />
        </div>
      </div>
    </div>
  )
}

