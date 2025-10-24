"use client"

import Link from "next/link"
import { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { AuthCard } from "./auth-card"
import { BrandPanel } from "./brand-panel"
import { EmailSignInForm, type EmailSignInFormProps } from "./email-sign-in-form"
import {
  GoogleIcon,
  SocialSignIn,
  type SocialProvider,
} from "./social-sign-in"

interface BrandContent {
  heading?: string
  highlight?: string
  footerLabel?: string
  wordmarkSrc?: string
  wordmarkAlt?: string
  footerLogoSrc?: string
  footerLogoAlt?: string
  backgroundGraphicSrc?: string
  backgroundGraphicAlt?: string
}

export interface LoginViewProps {
  className?: string
  brand?: BrandContent
  emailForm?: EmailSignInFormProps
  socialProviders?: SocialProvider[]
  termsLink?: {
    label: string
    href: string
  }
  auxiliaryContent?: ReactNode
  showBrandPanel?: boolean
}

const DEFAULT_BRAND: BrandContent = {
  heading: "Financiera",
  highlight: "mente",
  footerLabel: "Financiera mente",
  wordmarkSrc: "/logos/logo-financiera.svg",
  wordmarkAlt: "Financiera mente",
  footerLogoSrc: "/logos/logo-verde.svg",
  footerLogoAlt: "Financiera mente",
  backgroundGraphicSrc: "/logos/isologo.svg",
  backgroundGraphicAlt: "",
}

const DEFAULT_PROVIDERS: SocialProvider[] = [
  {
    id: "google",
    label: "Google",
    icon: <GoogleIcon className="size-5" />,
  },
]

export function LoginView({
  className,
  brand,
  emailForm,
  socialProviders = DEFAULT_PROVIDERS,
  termsLink = {
    label: "Términos y condiciones",
    href: "#",
  },
  auxiliaryContent,
  showBrandPanel = true,
}: LoginViewProps) {
  const brandConfig: BrandContent = {
    ...DEFAULT_BRAND,
    ...brand,
  }

  return (
    <section
      className={cn(
        "grid min-h-screen bg-background text-foreground md:grid-cols-2",
        className
      )}
    >
      {showBrandPanel ? (
        <BrandPanel
          footer={brandConfig.footerLabel}
          graphicSrc={brandConfig.backgroundGraphicSrc}
          graphicAlt={brandConfig.backgroundGraphicAlt}
          footerLogoSrc={brandConfig.footerLogoSrc}
          footerLogoAlt={brandConfig.footerLogoAlt}
        />
      ) : null}
      <div className="flex items-center justify-center px-6 py-12">
        <AuthCard
          title={brandConfig.heading}
          highlight={brandConfig.highlight}
          logoSrc={brandConfig.wordmarkSrc}
          logoAlt={brandConfig.wordmarkAlt}
          footer={
            <FooterLink href={termsLink.href}>{termsLink.label}</FooterLink>
          }
        >
          <div className="space-y-6">
            <EmailSignInForm {...emailForm} />
            <SocialSignIn providers={socialProviders} />
            {auxiliaryContent}
          </div>
        </AuthCard>
      </div>
    </section>
  )
}

function FooterLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-primary hover:underline"
    >
      {children}
    </Link>
  )
}
