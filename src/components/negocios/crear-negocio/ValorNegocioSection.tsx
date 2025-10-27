import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ValorInfo } from "@/types/crearNegocio"

export interface ValorNegocioSectionProps {
  data: ValorInfo
  onChange: (field: keyof ValorInfo, value: string) => void
  className?: string
}

export function ValorNegocioSection({
  data,
  onChange,
  className,
}: ValorNegocioSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <h2 className="text-lg font-bold text-teal-700">Valor del negociov</h2>

      {/* Lista numerada */}
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
        <li>Si el negocio es Crea Patrimonio de Skandi....</li>
        <li>Si tu cliente toma .....</li>
      </ol>

      {/* Campos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm text-gray-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
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

