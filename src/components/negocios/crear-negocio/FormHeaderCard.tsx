import * as React from "react"
import Image from "next/image"
import { cn } from "../../../lib/utils"

export interface FormHeaderCardProps {
  className?: string
}

export function FormHeaderCard({ className }: FormHeaderCardProps) {
  return (
    <div
      className={cn(
        "rounded-md flex items-center gap-4 p-4",
        className
      )}
      style={{ backgroundColor: '#00505C' }}
    >
      {/* Logo isologo */}
      <div className="shrink-0">
        <Image
          src="/logos/isologo.svg"
          alt="Financiera mente"
          width={200}
          height={60}
          className="h-16 w-full"
        />
      </div>

      {/* Texto */}
      <div className="flex flex-col">
        <span className="text-xl font-semibold" style={{ color: '#83D974' }}>
          Formulario unico de inscripcion Nacional
        </span>
        <span className="text-sm text-white">
          Formulario unico de inscripcion Nacional
        </span>
      </div>
    </div>
  )
}

