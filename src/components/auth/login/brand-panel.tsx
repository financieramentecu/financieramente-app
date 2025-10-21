import Image from "next/image"

import { cn } from "@/lib/utils"

export interface BrandPanelProps {
  className?: string
  footer?: string
  graphicSrc?: string
  graphicAlt?: string
  footerLogoSrc?: string
  footerLogoAlt?: string
}

export function BrandPanel({
  className,
  footer = "Financiera mente",
  graphicSrc,
  graphicAlt,
  footerLogoSrc,
  footerLogoAlt,
}: BrandPanelProps) {
  const hasGraphic = Boolean(graphicSrc)
  const hasFooterLogo = Boolean(footerLogoSrc)

  return (
    <aside
      className={cn(
        "relative hidden h-full flex-col justify-between overflow-hidden bg-primary px-12 py-10 text-primary-foreground md:flex",
        className
      )}
    >
      <div className="flex flex-1 items-start justify-start">
        {hasGraphic ? (
          <div className="pointer-events-none -ml-10 max-w-none select-none md:-ml-12 lg:-ml-16">
            <Image
              src={graphicSrc!}
              alt={graphicAlt ?? ""}
              width={520}
              height={499}
              priority
              className="h-auto w-[320px] md:w-[360px] lg:w-[420px]"
            />
          </div>
        ) : (
          <LeafMark className="h-[180px] w-[180px] text-primary-foreground/20" />
        )}
      </div>
      {hasFooterLogo ? (
        <div className="flex w-full justify-center">
          <Image
            src={footerLogoSrc!}
            alt={footerLogoAlt ?? footer}
            width={258}
            height={70}
            priority
            className="h-auto w-[200px] select-none md:w-[220px]"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 font-semibold uppercase tracking-[0.3em] text-secondary">
          <LeafMark className="h-8 w-8 text-secondary" />
          <span>{footer}</span>
        </div>
      )}
    </aside>
  )
}

interface LeafMarkProps {
  className?: string
}

function LeafMark({ className }: LeafMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      className={cn("text-current", className)}
    >
      <path
        d="M57.1 6.75c-8.7 0-16.3 4.76-20.41 11.85C32.58 11.51 24.92 6.75 16.22 6.75H6.9c-.9 0-1.63.73-1.63 1.63v10.77c0 7.68 6.22 13.91 13.9 13.91h9.2c.96 0 1.73-.78 1.73-1.73 0-6.75 5.47-12.22 12.22-12.22h14.77c.9 0 1.63-.73 1.63-1.63V8.38c0-.9-.73-1.63-1.63-1.63Z"
        fill="currentColor"
      />
      <path
        d="M47.9 25.81c-8.7 0-16.3 4.76-20.41 11.85-4.11-7.09-11.77-11.85-20.47-11.85H6.9c-.9 0-1.63.73-1.63 1.63v10.76c0 7.69 6.22 13.91 13.9 13.91h9.2c.96 0 1.73-.78 1.73-1.73 0-6.75 5.47-12.22 12.22-12.22h14.77c.9 0 1.63-.73 1.63-1.63v-10.83c0-.9-.73-1.63-1.63-1.63Z"
        fill="currentColor"
        opacity={0.6}
      />
    </svg>
  )
}
