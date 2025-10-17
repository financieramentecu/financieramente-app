import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const ButtonFixed = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Estilos inline como fallback para asegurar que los colores se apliquen
    const getInlineStyles = () => {
      if (variant === "default") {
        return {
          backgroundColor: '#00505C', // Verde oscuro de Financieramente
          color: 'white',
        }
      }
      if (variant === "secondary") {
        return {
          backgroundColor: '#83D874', // Verde claro de Financieramente
          color: '#00505C',
        }
      }
      if (variant === "destructive") {
        return {
          backgroundColor: '#ef4444',
          color: 'white',
        }
      }
      if (variant === "outline") {
        return {
          backgroundColor: 'transparent',
          color: '#00505C',
          border: '1px solid #e5e7eb',
        }
      }
      if (variant === "ghost") {
        return {
          backgroundColor: 'transparent',
          color: '#00505C',
        }
      }
      if (variant === "link") {
        return {
          backgroundColor: 'transparent',
          color: '#00505C',
          textDecoration: 'underline',
        }
      }
      return {}
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={getInlineStyles()}
        ref={ref}
        {...props}
      />
    )
  }
)
ButtonFixed.displayName = "ButtonFixed"

export { ButtonFixed, buttonVariants }
