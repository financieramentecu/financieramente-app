import { ReactNode } from "react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const DEFAULT_DIVIDER_LABEL = "o continúa con"

export interface SocialProvider {
  id: string
  label: string
  icon?: ReactNode
  onClick?: () => void
  buttonProps?: ButtonProps
}

export interface SocialSignInProps {
  providers?: SocialProvider[]
  dividerLabel?: string
}

export function SocialSignIn({
  providers = [],
  dividerLabel = DEFAULT_DIVIDER_LABEL,
}: SocialSignInProps) {
  if (providers.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <DividerWithLabel>{dividerLabel}</DividerWithLabel>
      <div className="grid gap-3">
        {providers.map((provider) => (
          <SocialButton key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  )
}

function DividerWithLabel({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex items-center">
      <Separator />
      <span className="absolute inset-0 flex items-center justify-center bg-background px-4 text-xs uppercase tracking-wide text-muted-foreground">
        {children}
      </span>
    </div>
  )
}

interface SocialButtonProps {
  provider: SocialProvider
}

function SocialButton({ provider }: SocialButtonProps) {
  const { icon, buttonProps, onClick, label } = provider

  return (
    <Button
      variant="outline"
      className={cn("w-full justify-center")}
      onClick={onClick}
      {...buttonProps}
    >
      {icon ?? <DefaultSocialIcon />}
      {label}
    </Button>
  )
}

function DefaultSocialIcon() {
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
      G
    </span>
  )
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} aria-hidden>
      <path
        d="M21.8 10.23H12v3.54h5.52a4.74 4.74 0 0 1-2.04 3.12v2.59h3.3c1.93-1.78 3.02-4.41 3.02-7.54 0-.52-.05-1.04-.14-1.53Z"
        fill="#1a73e8"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.61-2.52l-3.3-2.59c-.9.6-2.06.95-3.31.95-2.55 0-4.71-1.72-5.48-4.05H3.1v2.64A9.99 9.99 0 0 0 12 22Z"
        fill="#34a853"
      />
      <path
        d="M6.52 13.79A5.93 5.93 0 0 1 6.22 12c0-.62.11-1.21.3-1.79V7.57H3.1A9.99 9.99 0 0 0 2 12c0 1.61.38 3.13 1.1 4.43l3.42-2.64Z"
        fill="#fbbc05"
      />
      <path
        d="M12 6.08c1.47 0 2.78.51 3.82 1.51l2.86-2.86C16.95 2.75 14.7 2 12 2 7.65 2 3.96 4.47 3.1 7.57l3.42 2.64C7.29 7.89 9.45 6.08 12 6.08Z"
        fill="#ea4335"
      />
    </svg>
  )
}

