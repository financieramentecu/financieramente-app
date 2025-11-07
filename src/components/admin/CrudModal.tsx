"use client"

import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export interface CrudModalField {
  name: string
  label: string
  type: "text" | "number" | "email" | "textarea" | "select" | "switch" | "enum"
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  enumValues?: string[]
  disabled?: boolean
}

export interface CrudModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: CrudModalField[]
  schema: z.ZodObject<z.ZodRawShape>
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  mode: "create" | "edit"
  isLoading?: boolean
}

export function CrudModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  schema,
  initialData,
  onSubmit,
  mode,
  isLoading = false,
}: CrudModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {},
  })

  useEffect(() => {
    if (open) {
      reset(initialData || {})
    }
  }, [open, initialData, reset])

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    try {
      await onSubmit(data)
      reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting form:", error)
    }
  }

  const renderField = (field: CrudModalField) => {
    const error = errors[field.name]
    const value = watch(field.name)

    switch (field.type) {
      case "textarea":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              {...register(field.name)}
              placeholder={field.placeholder}
              disabled={field.disabled || isLoading}
              className={cn(error && "border-destructive")}
            />
            {error && (
              <p className="text-sm text-destructive">
                {error.message as string}
              </p>
            )}
          </div>
        )

      case "select":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value || ""}
              onValueChange={(val) => setValue(field.name, val)}
              disabled={field.disabled || isLoading}
            >
              <SelectTrigger className={cn(error && "border-destructive")}>
                <SelectValue placeholder={field.placeholder || "Seleccionar..."} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-sm text-destructive">
                {error.message as string}
              </p>
            )}
          </div>
        )

      case "enum":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value || ""}
              onValueChange={(val) => setValue(field.name, val)}
              disabled={field.disabled || isLoading}
            >
              <SelectTrigger className={cn(error && "border-destructive")}>
                <SelectValue placeholder={field.placeholder || "Seleccionar..."} />
              </SelectTrigger>
              <SelectContent>
                {field.enumValues?.map((enumValue) => (
                  <SelectItem key={enumValue} value={enumValue}>
                    {enumValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-sm text-destructive">
                {error.message as string}
              </p>
            )}
          </div>
        )

      case "switch":
        return (
          <div key={field.name} className="flex items-center justify-between space-x-2">
            <Label htmlFor={field.name} className="flex-1">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Switch
              id={field.name}
              checked={value || false}
              onCheckedChange={(checked) => setValue(field.name, checked)}
              disabled={field.disabled || isLoading}
            />
            {error && (
              <p className="text-sm text-destructive col-span-2">
                {error.message as string}
              </p>
            )}
          </div>
        )

      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              {...register(field.name, {
                valueAsNumber: field.type === "number",
              })}
              placeholder={field.placeholder}
              disabled={field.disabled || isLoading}
              className={cn(error && "border-destructive")}
            />
            {error && (
              <p className="text-sm text-destructive">
                {error.message as string}
              </p>
            )}
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div
                key={field.name}
                className={cn(
                  (field.type === "textarea" || field.type === "switch") &&
                    "md:col-span-2"
                )}
              >
                {renderField(field)}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting || isLoading
                ? "Guardando..."
                : mode === "create"
                  ? "Crear"
                  : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

