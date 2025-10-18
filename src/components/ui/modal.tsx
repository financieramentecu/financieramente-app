"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface ModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  children?: React.ReactNode
  trigger?: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl" | "full"
  variant?: "default" | "alert" | "confirm" | "form"
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
}

export interface AlertModalProps extends Omit<ModalProps, 'variant'> {
  type?: "info" | "success" | "warning" | "error"
  message: string
  confirmText?: string
  onConfirm?: () => void
}

export interface ConfirmModalProps extends Omit<ModalProps, 'variant'> {
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  destructive?: boolean
}

export interface FormModalProps extends Omit<ModalProps, 'variant'> {
  fields: Array<{
    name: string
    label: string
    type?: "text" | "email" | "password" | "number" | "textarea"
    placeholder?: string
    required?: boolean
    defaultValue?: string
  }>
  onSubmit?: (data: Record<string, string>) => void
  submitText?: string
  cancelText?: string
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({
    open,
    onOpenChange,
    title,
    description,
    children,
    trigger,
    size = "md",
    variant = "default",
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className,
    ...props
  }, ref) => {
    const sizeClasses = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      full: "max-w-full h-full"
    }

    const content = (
      <DialogContent
        ref={ref}
        className={cn(sizeClasses[size], className)}
        onPointerDownOutside={closeOnOverlayClick ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={closeOnEscape ? undefined : (e) => e.preventDefault()}
        {...props}
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        {!showCloseButton && <DialogClose className="hidden" />}
      </DialogContent>
    )

    if (trigger) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            {trigger}
          </DialogTrigger>
          {content}
        </Dialog>
      )
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {content}
      </Dialog>
    )
  }
)

Modal.displayName = "Modal"

// Componente AlertModal especializado
const AlertModal = React.forwardRef<HTMLDivElement, AlertModalProps>(
  ({
    open,
    onOpenChange,
    type = "info",
    message,
    confirmText = "Aceptar",
    onConfirm,
    trigger,
    ...props
  }, ref) => {
    const icons = {
      info: Info,
      success: CheckCircle,
      warning: AlertTriangle,
      error: XCircle
    }

    const iconColors = {
      info: "text-blue-500",
      success: "text-green-500",
      warning: "text-yellow-500",
      error: "text-red-500"
    }

    const Icon = icons[type]

    return (
      <Modal
        ref={ref}
        open={open}
        onOpenChange={onOpenChange}
        trigger={trigger}
        size="sm"
        variant="alert"
        {...props}
      >
        <div className="flex items-center space-x-4 py-4">
          <Icon className={cn("h-8 w-8", iconColors[type])} />
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onConfirm} className="w-full">
            {confirmText}
          </Button>
        </DialogFooter>
      </Modal>
    )
  }
)

AlertModal.displayName = "AlertModal"

// Componente ConfirmModal especializado
const ConfirmModal = React.forwardRef<HTMLDivElement, ConfirmModalProps>(
  ({
    open,
    onOpenChange,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
    onCancel,
    destructive = false,
    trigger,
    ...props
  }, ref) => {
    return (
      <Modal
        ref={ref}
        open={open}
        onOpenChange={onOpenChange}
        trigger={trigger}
        size="sm"
        variant="confirm"
        {...props}
      >
        <div className="py-4">
          <p className="text-sm">{message}</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            {cancelText}
          </Button>
          <Button 
            variant={destructive ? "destructive" : "default"} 
            onClick={onConfirm}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </Modal>
    )
  }
)

ConfirmModal.displayName = "ConfirmModal"

// Componente FormModal especializado
const FormModal = React.forwardRef<HTMLDivElement, FormModalProps>(
  ({
    open,
    onOpenChange,
    fields,
    onSubmit,
    submitText = "Enviar",
    cancelText = "Cancelar",
    trigger,
    ...props
  }, ref) => {
    const [formData, setFormData] = React.useState<Record<string, string>>({})

    React.useEffect(() => {
      const initialData: Record<string, string> = {}
      fields.forEach(field => {
        initialData[field.name] = field.defaultValue || ""
      })
      setFormData(initialData)
    }, [fields])

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit?.(formData)
    }

    const handleFieldChange = (name: string, value: string) => {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    return (
      <Modal
        ref={ref}
        open={open}
        onOpenChange={onOpenChange}
        trigger={trigger}
        size="md"
        variant="form"
        {...props}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
              {cancelText}
            </Button>
            <Button type="submit">
              {submitText}
            </Button>
          </DialogFooter>
        </form>
      </Modal>
    )
  }
)

FormModal.displayName = "FormModal"

export { Modal, AlertModal, ConfirmModal, FormModal }
