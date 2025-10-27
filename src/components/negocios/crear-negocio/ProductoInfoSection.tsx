import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Combobox } from "@/components/ui/combobox"
import type { ProductoInfo, ProductoOption } from "@/types/crearNegocio"

export interface ProductoInfoSectionProps {
  data: ProductoInfo
  onChange: (field: keyof ProductoInfo, value: string) => void
  productoOptions: ProductoOption[]
  companiaOptions: ProductoOption[]
  className?: string
}

export function ProductoInfoSection({
  data,
  onChange,
  productoOptions,
  companiaOptions,
  className,
}: ProductoInfoSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <h2 className="text-lg font-bold text-teal-700">
        Información del producto
      </h2>

      <div className="space-y-6">
        {/* Compañia */}
        <div className="space-y-2">
          <Label htmlFor="compañia" className="text-sm text-gray-700">
            Compañia
          </Label>
          <Combobox
            options={companiaOptions}
            value={data.compañia}
            onValueChange={(value) => onChange("compañia", value)}
            placeholder="Selecciona una compañía"
            searchPlaceholder="Buscar compañía..."
            emptyMessage="No se encontraron compañías"
            className="w-full"
          />
          <p className="text-xs text-gray-600">
            Si estas registrado a un negocio internacional elige el nombre del producto......
          </p>
        </div>

        {/* Producto y Valor - Grid de 2 columnas */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="producto" className="text-sm text-gray-700">
              Producto
            </Label>
            <Select value={data.producto} onValueChange={(value) => onChange("producto", value)}>
              <SelectTrigger id="producto" className="w-full border-gray-300">
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {productoOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor" className="text-sm text-gray-700">
              Valor
            </Label>
            <Input
              id="valor"
              value={data.valor}
              onChange={(e) => onChange("valor", e.target.value)}
              className="w-full border-gray-300"
            />
          </div>
        </div>

        {/* Plazo */}
        <div className="space-y-2">
          <Label htmlFor="plazo" className="text-sm text-gray-700">
            Plazo
          </Label>
          <Input
            id="plazo"
            value={data.plazo}
            onChange={(e) => onChange("plazo", e.target.value)}
            className="w-full border-gray-300"
          />
        </div>
      </div>
    </div>
  )
}

