import Image from "next/image"
import { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AuthCardProps {
  className?: string
  title?: string
  highlight?: string
  children: ReactNode
  footer?: ReactNode
  logoSrc?: string
  logoAlt?: string
}

export function AuthCard({
  className,
  title = "Financiera",
  highlight = "mente",
  children,
  footer,
  logoSrc,
  logoAlt,
}: AuthCardProps) {
  const fallbackAlt = [title, highlight]
    .filter(Boolean)
    .join(" ")
    .trim()

  const computedLogoAlt =
    logoAlt ?? (fallbackAlt !== "" ? fallbackAlt : "Logotipo")

  return (
    <Card className={cn("w-full max-w-md border-none shadow-none", className)}>
      <CardHeader className="items-center space-y-4 text-center">
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt={computedLogoAlt}
            width={350}
            height={87}
            priority
            className="h-auto w-[220px] select-none"
          />
        ) : (
          <BrandWordmark title={title} highlight={highlight} />
        )}
        <CardDescription className="text-sm text-muted-foreground">
          Gestiona tus finanzas con seguridad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
        {footer ? (
          <div className="text-center text-xs text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface BrandWordmarkProps {
  title: string
  highlight: string
}

function BrandWordmark({ title, highlight }: BrandWordmarkProps) {
  return (
    <div className="flex flex-col text-3xl font-semibold leading-tight tracking-tight text-primary">
      <span>{title}</span>
      <span className="text-secondary">{highlight}</span>
    </div>
  )
}
