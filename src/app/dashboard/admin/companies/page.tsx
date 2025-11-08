"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { CrudTable, type CrudTableColumn } from "@/components/admin/CrudTable"
import { CrudModal, type CrudModalField } from "@/components/admin/CrudModal"
import { DeleteConfirmModal } from "@/components/admin/DeleteConfirmModal"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { companySchema, type CompanyFormData } from "@/lib/admin/schemas"

interface Company {
  idCompany: number
  name: string
  idTypeCompany: string
  status: boolean
  createdAt: string
  updatedAt: string
}

export default function CompaniesAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [mode, setMode] = useState<"create" | "edit">("create")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadCompanies = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/companies")
      const data = await response.json()
      if (response.ok) {
        setCompanies(data.companies || [])
      } else {
        toast.error("Error al cargar compañías", {
          description: data.error || "Ocurrió un error inesperado",
        })
      }
    } catch (error) {
      console.error("Error loading companies:", error)
      toast.error("Error al cargar compañías")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  const handleCreate = () => {
    setSelectedCompany(null)
    setMode("create")
    setIsModalOpen(true)
  }

  const handleEdit = (company: Company) => {
    setSelectedCompany(company)
    setMode("edit")
    setIsModalOpen(true)
  }

  const handleDelete = (company: Company) => {
    setSelectedCompany(company)
    setIsDeleteModalOpen(true)
  }

  const handleSubmit = async (data: CompanyFormData) => {
    try {
      setIsSubmitting(true)
      const url = mode === "create"
        ? "/api/admin/companies"
        : `/api/admin/companies/${selectedCompany?.idCompany}`
      
      const method = mode === "create" ? "POST" : "PUT"
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || "Error al guardar compañía")
      }

      toast.success(
        mode === "create" ? "Compañía creada exitosamente" : "Compañía actualizada exitosamente"
      )
      
      setIsModalOpen(false)
      setSelectedCompany(null)
      loadCompanies()
    } catch (error) {
      console.error("Error saving company:", error)
      toast.error("Error al guardar compañía", {
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedCompany) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/admin/companies/${selectedCompany.idCompany}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al eliminar compañía")
      }

      toast.success("Compañía eliminada exitosamente")
      setIsDeleteModalOpen(false)
      setSelectedCompany(null)
      loadCompanies()
    } catch (error) {
      console.error("Error deleting company:", error)
      toast.error("Error al eliminar compañía", {
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: CrudTableColumn<Company>[] = [
    {
      key: "idCompany",
      header: "ID",
      cellRenderer: (value) => <span className="font-medium">#{value}</span>,
    },
    {
      key: "name",
      header: "Nombre",
      cellRenderer: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "idTypeCompany",
      header: "Tipo",
      cellRenderer: (value) => (
        <span className="text-sm">{value === "NACIONAL" ? "Nacional" : "Internacional"}</span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cellRenderer: (value: boolean) => (
        <Badge variant={value ? "success" : "neutral"}>
          {value ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
  ]

  const fields: CrudModalField[] = [
    {
      name: "name",
      label: "Nombre",
      type: "text",
      placeholder: "Ej: Skandia",
      required: true,
    },
    {
      name: "idTypeCompany",
      label: "Tipo de Compañía",
      type: "enum",
      enumValues: ["NACIONAL", "INTERNACIONAL"],
      required: true,
    },
    {
      name: "status",
      label: "Activo",
      type: "switch",
      required: false,
      description: "Controla si la compañía está disponible para nuevas operaciones.",
    },
  ]

  return (
    <DashboardLayout currentPage="Compañías">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Compañías</h1>
            <p className="text-muted-foreground mt-2">
              Gestiona las compañías aseguradoras del sistema
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Crear Compañía
          </Button>
        </div>

        <CrudTable
          data={companies}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
          searchable={true}
          emptyMessage="No hay compañías registradas"
        />

        <CrudModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          title={mode === "create" ? "Crear Compañía" : "Editar Compañía"}
          description={
            mode === "create"
              ? "Completa el formulario para crear una nueva compañía"
              : "Modifica los datos de la compañía"
          }
          fields={fields}
          schema={companySchema}
          initialData={
            mode === "edit" && selectedCompany
              ? {
                  name: selectedCompany.name,
                  idTypeCompany: selectedCompany.idTypeCompany,
                  status: selectedCompany.status,
                }
              : {
                  idTypeCompany: "NACIONAL",
                  status: true,
                }
          }
          onSubmit={handleSubmit}
          mode={mode}
          isLoading={isSubmitting}
        />

        <DeleteConfirmModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          itemName={selectedCompany?.name || ""}
          onConfirm={handleDeleteConfirm}
          isLoading={isSubmitting}
        />
      </div>
    </DashboardLayout>
  )
}

