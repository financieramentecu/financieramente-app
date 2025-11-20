"use client"

import React, { useEffect, useMemo, useState } from "react"
// Icons removed - not used
import { toast } from "sonner"
import { format } from "date-fns"

import { DashboardLayout } from "@/layouts/DashboardLayout"
import { CrudTable, type CrudTableColumn } from "@/components/admin/CrudTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
  id: number
  name: string
  lastName: string | null
  email: string
  avatar: string | null
  role: {
    id: number
    code: string
    name: string
  } | null
  active: boolean
  createdAt: string
  lastLogin: string | null
}

interface Role {
  idRole: number
  code: string
  name: string
  description: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false)
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  const loadRoles = async () => {
    try {
      const response = await fetch("/api/admin/roles")
      const data = await response.json()
      if (response.ok) {
        setRoles(data.data || [])
      } else {
        toast.error("Error al cargar roles", {
          description: data.error || 'Ocurrió un error inesperado',
        })
      }
    } catch (error) {
      console.error("Error loading roles:", error)
      toast.error("Error al cargar roles")
    }
  }

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) {
        params.set("search", searchQuery)
      }
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter)
      }
      if (roleFilter && roleFilter !== "all") {
        params.set("role", roleFilter)
      }
      const queryString = params.toString()
      const response = await fetch(
        `/api/admin/users${queryString ? `?${queryString}` : ""}`
      )
      const data = await response.json()
      if (response.ok) {
        setUsers(data.data || [])
      } else {
        toast.error("Error al cargar usuarios", {
          description: data.error || 'Ocurrió un error inesperado',
        })
      }
    } catch (error) {
      console.error("Error loading users:", error)
      toast.error("Error al cargar usuarios")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
    loadUsers()
  }, [searchQuery, statusFilter, roleFilter])

  const handleActivate = async () => {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/admin/users/${selectedUser.id}/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleId: selectedRoleId ? parseInt(selectedRoleId) : null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al activar usuario")
      }

      toast.success("Usuario activado exitosamente", {
        description: "Se envió un email de notificación al usuario",
      })
      setIsActivateModalOpen(false)
      setSelectedUser(null)
      setSelectedRoleId("")
      loadUsers()
    } catch (error) {
      console.error("Error activating user:", error)
      toast.error("Error al activar usuario", {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = async () => {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/admin/users/${selectedUser.id}/deactivate`, {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al desactivar usuario")
      }

      toast.success("Usuario desactivado exitosamente")
      setIsDeactivateModalOpen(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error) {
      console.error("Error deactivating user:", error)
      toast.error("Error al desactivar usuario", {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeRole = async () => {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleId: selectedRoleId ? parseInt(selectedRoleId) : null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al cambiar rol")
      }

      toast.success("Rol actualizado exitosamente", {
        description: "El cambio se reflejará en la próxima sesión del usuario",
      })
      setIsRoleModalOpen(false)
      setSelectedUser(null)
      setSelectedRoleId("")
      loadUsers()
    } catch (error) {
      console.error("Error changing role:", error)
      toast.error("Error al cambiar rol", {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string, lastName: string | null) => {
    const firstInitial = name?.[0]?.toUpperCase() || ""
    const lastInitial = lastName?.[0]?.toUpperCase() || ""
    return `${firstInitial}${lastInitial}` || "U"
  }

  const columns: CrudTableColumn<User>[] = [
    {
      key: "name",
      header: "Usuario",
      cellRenderer: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.avatar || undefined} alt={row.name} />
            <AvatarFallback>{getInitials(row.name, row.lastName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {row.name} {row.lastName || ""}
            </div>
            <div className="text-sm text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      cellRenderer: (value) => {
        const role = value as { name: string; code: string } | null
        if (!role) {
          return <Badge variant="outline">Sin rol</Badge>
        }
        return (
          <Badge variant={role.code === "DEFAULT" ? "secondary" : "default"}>
            {role.name}
          </Badge>
        )
      },
    },
    {
      key: "active",
      header: "Estado",
      cellRenderer: (value) => (
        <Badge variant={(value as boolean) ? "success" : "destructive"}>
          {(value as boolean) ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Fecha de creación",
      cellRenderer: (value) => {
        const date = new Date(value as string)
        return (
          <span className="text-sm text-muted-foreground">
            {format(date, "dd/MM/yyyy")}
          </span>
        )
      },
    },
    {
      key: "lastLogin",
      header: "Último acceso",
      cellRenderer: (value) => {
        if (!value) {
          return <span className="text-sm text-muted-foreground">Nunca</span>
        }
        const date = new Date(value as string)
        return (
          <span className="text-sm text-muted-foreground">
            {format(date, "dd/MM/yyyy HH:mm")}
          </span>
        )
      },
    },
  ]

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: role.idRole.toString(),
        label: role.name,
      })),
    [roles]
  )

  return (
    <DashboardLayout currentPage="Usuarios">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground mt-2">
              Administra usuarios, roles y accesos del sistema
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="md:w-1/3"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="md:w-64">
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.code} value={role.code}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabla */}
        <CrudTable
          data={users}
          columns={columns}
          onEdit={(user) => {
            setSelectedUser(user as User)
            setSelectedRoleId(user.role?.id.toString() || "")
            setIsRoleModalOpen(true)
          }}
          onDelete={(user) => {
            const userData = user as User
            if (userData.active) {
              setSelectedUser(userData)
              setIsDeactivateModalOpen(true)
            } else {
              setSelectedUser(userData)
              setIsActivateModalOpen(true)
            }
          }}
          isLoading={isLoading}
          searchable={false}
          emptyMessage="No hay usuarios registrados"
        />

        {/* Modal de Activación */}
        <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activar Usuario</DialogTitle>
              <DialogDescription>
                Activa la cuenta de {selectedUser?.name} y asigna un rol.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Rol</label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions
                      .filter((role) => role.value !== roles.find((r) => r.code === "DEFAULT")?.idRole.toString())
                      .map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  El usuario recibirá un email de notificación
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsActivateModalOpen(false)
                  setSelectedUser(null)
                  setSelectedRoleId("")
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button onClick={handleActivate} disabled={isSubmitting || !selectedRoleId}>
                {isSubmitting ? "Activando..." : "Activar Usuario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Desactivación */}
        <Dialog open={isDeactivateModalOpen} onOpenChange={setIsDeactivateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Desactivar Usuario</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas desactivar la cuenta de {selectedUser?.name}?
                El usuario no podrá acceder al sistema hasta que sea reactivado.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeactivateModalOpen(false)
                  setSelectedUser(null)
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeactivate} disabled={isSubmitting}>
                {isSubmitting ? "Desactivando..." : "Desactivar Usuario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Cambio de Rol */}
        <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Rol</DialogTitle>
              <DialogDescription>
                Modifica el rol de {selectedUser?.name}. El cambio se reflejará en su próxima sesión.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Nuevo Rol</label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions
                      .filter((role) => role.value !== roles.find((r) => r.code === "DEFAULT")?.idRole.toString())
                      .map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  El cambio se registrará en el log de auditoría
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRoleModalOpen(false)
                  setSelectedUser(null)
                  setSelectedRoleId("")
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button onClick={handleChangeRole} disabled={isSubmitting || !selectedRoleId}>
                {isSubmitting ? "Actualizando..." : "Actualizar Rol"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
