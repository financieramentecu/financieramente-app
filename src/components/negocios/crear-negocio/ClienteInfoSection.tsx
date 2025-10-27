import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ClienteInfo } from "@/types/crearNegocio"

export interface ClienteInfoSectionProps {
  data: ClienteInfo
  onChange: (field: keyof ClienteInfo, value: string) => void
  className?: string
}

export function ClienteInfoSection({
  data,
  onChange,
  className,
}: ClienteInfoSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <h2 className="text-lg font-bold text-teal-700">
        Información basica y general del cliente
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Columna 1 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documento" className="text-sm text-gray-700">
              No. Documento
            </Label>
            <Input
              id="documento"
              value={data.documento}
              onChange={(e) => onChange("documento", e.target.value)}
              className="w-full border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombres" className="text-sm text-gray-700">
              Nombres
            </Label>
            <Input
              id="nombres"
              value={data.nombres}
              onChange={(e) => onChange("nombres", e.target.value)}
              className="w-full border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contacto" className="text-sm text-gray-700">
              Contacto
            </Label>
            <Input
              id="contacto"
              value={data.contacto}
              onChange={(e) => onChange("contacto", e.target.value)}
              className="w-full border-gray-300"
            />
          </div>
        </div>

        {/* Columna 2 */}
        <div className="space-y-4">
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
            <Label htmlFor="apellidos" className="text-sm text-gray-700">
              Apellidos
            </Label>
            <Input
              id="apellidos"
              value={data.apellidos}
              onChange={(e) => onChange("apellidos", e.target.value)}
              className="w-full border-gray-300"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

