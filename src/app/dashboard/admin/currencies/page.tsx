"use client"

import React, { useEffect, useState } from "react"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { CrudTable, type CrudTableColumn } from "@/components/admin/CrudTable"
import { CrudModal, type CrudModalField } from "@/components/admin/CrudModal"
import { DeleteConfirmModal } from "@/components/admin/DeleteConfirmModal"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { currencySchema, type CurrencyFormData } from "@/lib/admin/schemas"

interface Currency {
  idCurrency: number
  name: string
  symbol: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export default function CurrenciesAdminPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [mode, setMode] = useState<"create" | "edit">("create")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadCurrencies = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/currencies")
      const data = await response.json()
      if (response.ok) {
        setCurrencies(data.currencies || [])
      } else {
        toast.error("Error al cargar monedas", {
          description: data.error || "Ocurrió un error inesperado",
        })
      }
    } catch (error) {
      console.error("Error loading currencies:", error)
      toast.error("Error al cargar monedas")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCurrencies()
  }, [])

  const handleCreate = () => {
    setSelectedCurrency(null)
    setMode("create")
    setIsModalOpen(true)
  }

  const handleEdit = (currency: Currency) => {
    setSelectedCurrency(currency)
    setMode("edit")
    setIsModalOpen(true)
  }

  const handleDelete = (currency: Currency) => {
    setSelectedCurrency(currency)
    setIsDeleteModalOpen(true)
  }

  const handleSubmit = async (data: CurrencyFormData) => {
    try {
      setIsSubmitting(true)
      const url =
        mode === "create"
          ? "/api/admin/currencies"
          : `/api/admin/currencies/${selectedCurrency?.idCurrency}`

      const method = mode === "create" ? "POST" : "PUT"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          symbol: data.symbol === "" ? undefined : data.symbol,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || "Error al guardar moneda")
      }

      toast.success(
        mode === "create" ? "Moneda creada exitosamente" : "Moneda actualizada exitosamente"
      )

      setIsModalOpen(false)
      setSelectedCurrency(null)
      loadCurrencies()
    } catch (error) {
      console.error("Error saving currency:", error)
      toast.error("Error al guardar moneda", {
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedCurrency) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/admin/currencies/${selectedCurrency.idCurrency}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al eliminar moneda")
      }

      toast.success("Moneda eliminada exitosamente")
      setIsDeleteModalOpen(false)
      setSelectedCurrency(null)
      loadCurrencies()
    } catch (error) {
      console.error("Error deleting currency:", error)
      toast.error("Error al eliminar moneda", {
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: CrudTableColumn<Currency>[] = [
    {
      key: "idCurrency",
      header: "ID",
      cellRenderer: (value) => <span className="font-medium">#{value}</span>,
    },
    {
      key: "name",
      header: "Nombre",
      cellRenderer: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "symbol",
      header: "Símbolo",
      cellRenderer: (value) =>
        value ? <span className="font-mono">{value}</span> : <span className="text-muted-foreground">-</span>,
    },
    {
      key: "active",
      header: "Estado",
      cellRenderer: (value: boolean) => (
        <Badge variant={value ? "success" : "neutral"}>
          {value ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
  ]

  const fields: CrudModalField[] = [
    {
      name: "name",
      label: "Nombre",
      type: "text",
      placeholder: "Ej: Peso Colombiano",
      required: true,
    },
    {
      name: "symbol",
      label: "Símbolo",
      type: "text",
      placeholder: "Ej: COP",
      required: false,
    },
    {
      name: "active",
      label: "Activo",
      type: "switch",
      required: false,
      description: "Define si la moneda puede ser seleccionada al crear negocios.",
    },
  ]

  return (
    <DashboardLayout currentPage="Monedas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monedas</h1>
            <p className="text-muted-foreground mt-2">
              Gestiona las monedas disponibles para los negocios
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Crear Moneda
          </Button>
        </div>

        <CrudTable
          data={currencies}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
          searchable
          emptyMessage="No hay monedas registradas"
        />

        <CrudModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          title={mode === "create" ? "Crear Moneda" : "Editar Moneda"}
          description={
            mode === "create"
              ? "Completa el formulario para registrar una nueva moneda"
              : "Modifica los datos de la moneda seleccionada"
          }
          fields={fields}
          schema={currencySchema}
          initialData={
            mode === "edit" && selectedCurrency
              ? {
                  name: selectedCurrency.name,
                  symbol: selectedCurrency.symbol || "",
                  active: selectedCurrency.active,
                }
              : {
                  active: true,
                }
          }
          onSubmit={handleSubmit}
          mode={mode}
          isLoading={isSubmitting}
        />

        <DeleteConfirmModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          itemName={selectedCurrency?.name || ""}
          onConfirm={handleDeleteConfirm}
          isLoading={isSubmitting}
        />
      </div>
    </DashboardLayout>
  )
}


