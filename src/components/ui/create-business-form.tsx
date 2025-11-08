"use client"

import * as React from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { businessFormSchema, type BusinessFormData } from "@/types/business-form"
import { DocumentAutocomplete, type User } from "@/components/ui/document-autocomplete"
import { AgentAutocomplete, type Agent } from "@/components/ui/agent-autocomplete"
import { toast } from "sonner"

export interface CreateBusinessFormProps {
  onSubmit?: (data: BusinessFormData) => void | Promise<void>
  onCancel?: () => void
  defaultValues?: Partial<BusinessFormData>
  users?: User[]
  agents?: Agent[]
  onUserCreated?: (documento: string) => void | Promise<void>
  companiesOptions?: { value: string; label: string }[]
  productsOptions?: { value: string; label: string; companyId: string }[]
  periodicitiesOptions?: { value: string; label: string }[]
  currenciesOptions?: { value: string; label: string }[]
}

export const CreateBusinessForm = React.forwardRef<
  HTMLFormElement,
  CreateBusinessFormProps
>(({ onSubmit, onCancel, defaultValues, users, agents, onUserCreated, companiesOptions: providedCompanies, productsOptions: providedProducts, periodicitiesOptions: providedPeriodicities, currenciesOptions: providedCurrencies }, ref) => {
  const [numeroDocumento, setNumeroDocumento] = React.useState("")
  const [companiesOptions, setCompaniesOptions] = React.useState<{ value: string; label: string }[]>(providedCompanies || [])
  const [productsOptions, setProductsOptions] = React.useState<{ value: string; label: string; companyId: string }[]>(providedProducts || [])
  const [periodicitiesOptions, setPeriodicitiesOptions] = React.useState<{ value: string; label: string }[]>(providedPeriodicities || [])
  const [currenciesOptions, setCurrenciesOptions] = React.useState<{ value: string; label: string }[]>(providedCurrencies || [])
  const [agentsList, setAgentsList] = React.useState<Agent[]>(agents || [])
  const [userResults, setUserResults] = React.useState<User[]>(users || [])
  const [isCatalogLoading, setIsCatalogLoading] = React.useState(false)
  const lastUsersRef = React.useRef<User[]>(users || [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      email: defaultValues?.email || "",
      nombres: defaultValues?.nombres || "",
      apellidos: defaultValues?.apellidos || "",
      contacto: defaultValues?.contacto || "",
      numeroDocumento: defaultValues?.numeroDocumento || "",
      compania: defaultValues?.compania || "",
      producto: defaultValues?.producto || "",
      plazo: defaultValues?.plazo || undefined,
      moneda: defaultValues?.moneda || "",
      perioricidad: defaultValues?.perioricidad || "",
      valor: defaultValues?.valor || undefined,
      agente: defaultValues?.agente || "",
    },
  })

  const selectedCompany = watch("compania")
  const selectedProduct = watch("producto")

  const filteredProducts = React.useMemo(() => {
    if (!selectedCompany) {
      return productsOptions
    }
    return productsOptions.filter((product) => product.companyId === selectedCompany)
  }, [productsOptions, selectedCompany])

  React.useEffect(() => {
    if (selectedProduct && !filteredProducts.some((product) => product.value === selectedProduct)) {
      setValue("producto", "")
    }
  }, [filteredProducts, selectedProduct, setValue])

  // Observar cambios en numeroDocumento
  const documentValue = watch("numeroDocumento")
  
  React.useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const requests: Promise<void>[] = []

        const shouldFetchCompanies = !providedCompanies || providedCompanies.length === 0
        const shouldFetchProducts = !providedProducts || providedProducts.length === 0
        const shouldFetchPeriodicities = !providedPeriodicities || providedPeriodicities.length === 0
        const shouldFetchCurrencies = !providedCurrencies || providedCurrencies.length === 0

        if (shouldFetchCompanies) {
          requests.push(
            fetch("/api/admin/companies?status=active")
              .then((response) => {
                if (!response.ok) throw new Error("Error al cargar compañías")
                return response.json()
              })
              .then((data) => {
                setCompaniesOptions(
                  (data.companies ?? []).map((company: { idCompany: number; name: string }) => ({
                    value: String(company.idCompany),
                    label: company.name,
                  }))
                )
              })
          )
        }

        if (shouldFetchProducts) {
          requests.push(
            fetch("/api/admin/products?status=active")
              .then((response) => {
                if (!response.ok) throw new Error("Error al cargar productos")
                return response.json()
              })
              .then((data) => {
                setProductsOptions(
                  (data.products ?? []).map(
                    (product: { idProduct: number; name: string; idCompany: number }) => ({
                      value: String(product.idProduct),
                      label: product.name,
                      companyId: String(product.idCompany),
                    })
                  )
                )
              })
          )
        }

        if (shouldFetchPeriodicities) {
          requests.push(
            fetch("/api/admin/periodicities?status=active")
              .then((response) => {
                if (!response.ok) throw new Error("Error al cargar periodicidades")
                return response.json()
              })
              .then((data) => {
                setPeriodicitiesOptions(
                  (data.periodicities ?? []).map(
                    (periodicity: { idBuyPeriodicity: number; name: string }) => ({
                      value: String(periodicity.idBuyPeriodicity),
                      label: periodicity.name,
                    })
                  )
                )
              })
          )
        }

        if (shouldFetchCurrencies) {
          requests.push(
            fetch("/api/admin/currencies?status=active")
              .then((response) => {
                if (!response.ok) throw new Error("Error al cargar monedas")
                return response.json()
              })
              .then((data) => {
                setCurrenciesOptions(
                  (data.currencies ?? []).map(
                    (currency: { idCurrency: number; name: string; symbol?: string | null }) => ({
                      value: String(currency.idCurrency),
                      label: currency.symbol ? `${currency.symbol} - ${currency.name}` : currency.name,
                    })
                  )
                )
              })
          )
        }

        const shouldFetchAgents = !agents || agents.length === 0

        if (shouldFetchAgents) {
          requests.push(
            fetch("/api/admin/agents")
              .then((response) => {
                if (!response.ok) throw new Error("Error al cargar agentes")
                return response.json()
              })
              .then((data) => {
                setAgentsList(
                  (data.agents ?? []).map(
                    (agent: { idUser: number; name: string; lastName?: string | null; email?: string | null; code?: string | null }) => ({
                      id: String(agent.idUser),
                      nombre: agent.lastName ? `${agent.name} ${agent.lastName}` : agent.name,
                      email: agent.email ?? undefined,
                      codigo: agent.code ?? undefined,
                    })
                  )
                )
              })
          )
        }

        if (requests.length === 0) {
          return
        }

        setIsCatalogLoading(true)
        await Promise.all(requests)
      } catch (error) {
        console.error("Error loading catalogs:", error)
        toast.error("Error al cargar catálogos", {
          description:
            error instanceof Error ? error.message : "No fue posible obtener la información inicial.",
        })
      } finally {
        setIsCatalogLoading(false)
      }
    }

    loadCatalogs()
  }, [providedCompanies, providedProducts, providedPeriodicities, providedCurrencies, agents])

  React.useEffect(() => {
    if (Array.isArray(users) && users.length > 0) {
      setUserResults(users)
      lastUsersRef.current = users
    }
  }, [users])

  React.useEffect(() => {
    if (Array.isArray(agents) && agents.length > 0) {
      setAgentsList(agents)
    }
  }, [agents])
  // Lista de usuarios para el autocomplete
  const usersList = userResults

  React.useEffect(() => {
    setNumeroDocumento(documentValue || "")
  }, [documentValue])

  const handleSearchUsers = React.useCallback(async (query: string) => {
    try {
      const response = await fetch(
        `/api/users/search?query=${encodeURIComponent(query)}&limit=10`
      )

      if (!response.ok) {
        throw new Error("Error al buscar usuarios")
      }

      const data = await response.json()
      const results: User[] = (data.users ?? []).map(
        (user: {
          idUser: number
          name: string
          lastName?: string | null
          email?: string | null
          identityNumber: string
          phone?: string | null
        }) => ({
          numeroDocumento: user.identityNumber,
          nombres: user.name,
          apellidos: user.lastName ?? "",
          email: user.email ?? undefined,
          contacto: user.phone ?? undefined,
        })
      )

      setUserResults(results)
      lastUsersRef.current = results
      return results
    } catch (error) {
      console.error("Error fetching users:", error)
      return lastUsersRef.current
    }
  }, [])

  // Determinar si los campos deben estar bloqueados
  const isBlocked = !numeroDocumento || numeroDocumento.length < 5

  // Handler para cuando se selecciona un documento
  const handleDocumentChange = (documento: string) => {
    setValue("numeroDocumento", documento, { shouldValidate: true })
    setNumeroDocumento(documento)

    // Si se seleccionó un usuario existente, autocompletar campos
    if (documento && usersList) {
      const selectedUser = usersList.find((u) => u.numeroDocumento === documento)
      if (selectedUser) {
        setValue("email", selectedUser.email || "")
        setValue("nombres", selectedUser.nombres)
        setValue("apellidos", selectedUser.apellidos)
        if (selectedUser.contacto) {
          setValue("contacto", selectedUser.contacto)
        }
      }
    }
  }

  // Handler para crear nuevo usuario
  const handleCreateUser = async (documento: string) => {
    // Asegurar explícitamente que el documento se establezca para desbloquear campos
    // Esto es necesario porque el onChange puede no haber actualizado el estado aún
    setValue("numeroDocumento", documento, { shouldValidate: true })
    setNumeroDocumento(documento)
    
    // Limpiar los campos de información del cliente cuando se crea un nuevo usuario
    // para evitar que se muestren valores por defecto
    setValue("email", "")
    setValue("nombres", "")
    setValue("apellidos", "")
    
    // Notificar que se está creando un nuevo usuario
    if (onUserCreated) {
      await onUserCreated(documento)
    }
  }

  const handleFormSubmit = async (data: BusinessFormData) => {
    try {
      await onSubmit?.(data)
    } catch (error) {
      console.error("Error submitting form:", error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        {/* Logo Financiera mente */}
        <div className="flex items-center gap-3">
          <Image
            src="/logos/logo-financiera.svg"
            alt="Financiera mente"
            width={140}
            height={35}
            className="h-auto w-auto"
          />
        </div>

        {/* Banner con Isologo */}
        <div className="bg-[#00505C] w-full sm:w-auto px-4 sm:px-8 py-4 rounded-lg flex items-center gap-4 sm:gap-6">
          <div className="w-1/2 sm:w-auto flex items-center justify-center">
            <Image
              src="/logos/isologo.svg"
              alt="Isologo"
              width={120}
              height={120}
              className="w-full sm:w-24 sm:h-24 h-auto object-contain"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <h1 className="text-[#83D874] font-bold text-base sm:text-lg">
              Formulario único de inscripción Nacional
            </h1>
            <p className="text-[#6BCA6F] text-sm sm:text-base">
              Formulario único de inscripción Nacional
            </p>
          </div>
        </div>
      </div>

      <form ref={ref} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Sección 1: Información básica y general del cliente */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-[#00505C]">Información básica y general del cliente</h3>
            <Separator className="bg-gray-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroDocumento" id="numeroDocumento-label" className="text-sm font-medium">
                No. Documento <span className="text-red-500">*</span>
              </Label>
              <DocumentAutocomplete
                value={documentValue}
                onChange={handleDocumentChange}
              users={usersList}
              onSearch={handleSearchUsers}
                placeholder="Buscar o crear documento..."
                onCreateNew={handleCreateUser}
                aria-labelledby="numeroDocumento-label"
                className={errors.numeroDocumento ? "border-red-500" : ""}
              />
              {errors.numeroDocumento && (
                <p className="text-xs text-red-500">{errors.numeroDocumento.message}</p>
              )}
              {!errors.numeroDocumento && documentValue && documentValue.length > 0 && documentValue.length < 5 && (
                <p className="text-xs text-amber-600">
                  El documento debe tener al menos 5 caracteres para habilitar los campos
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                {...register("email")}
                placeholder="email@gmail.com"
                disabled={isBlocked}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellidos" className="text-sm font-medium">
                Apellidos
              </Label>
              <Input
                id="apellidos"
                {...register("apellidos")}
                placeholder="Apellidos"
                disabled={isBlocked}
                className={errors.apellidos ? "border-red-500" : ""}
              />
              {errors.apellidos && (
                <p className="text-xs text-red-500">{errors.apellidos.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombres" className="text-sm font-medium">
                Nombres
              </Label>
              <Input
                id="nombres"
                {...register("nombres")}
                placeholder="Nombres"
                disabled={isBlocked}
                className={errors.nombres ? "border-red-500" : ""}
              />
              {errors.nombres && (
                <p className="text-xs text-red-500">{errors.nombres.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacto" className="text-sm font-medium">
                Contacto
              </Label>
              <Input
                id="contacto"
                {...register("contacto")}
                placeholder="XXX XXX X"
                disabled={isBlocked}
                className={errors.contacto ? "border-red-500" : ""}
              />
              {errors.contacto && (
                <p className="text-xs text-red-500">{errors.contacto.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sección 2: Información del producto */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-[#00505C]">Información del producto</h3>
            <Separator className="bg-gray-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="compania" className="text-sm font-medium">
                Compañía
              </Label>
              <Select
                disabled={isBlocked || isCatalogLoading}
                value={selectedCompany || ""}
                onValueChange={(value) => {
                  setValue("compania", value, { shouldValidate: true })
                  setValue("producto", "")
                }}
              >
                <SelectTrigger id="compania" className={errors.compania ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccione una compañía" />
                </SelectTrigger>
                <SelectContent>
                  {companiesOptions.map((company) => (
                    <SelectItem key={company.value} value={company.value}>
                      {company.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.compania && (
                <p className="text-xs text-red-500">{errors.compania.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Si estas registrado a un negocio internacional elige el nombre del producto...
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="producto" className="text-sm font-medium">
                Producto
              </Label>
              <Select
                disabled={isBlocked || isCatalogLoading || filteredProducts.length === 0}
                value={selectedProduct || ""}
                onValueChange={(value) => setValue("producto", value, { shouldValidate: true })}
              >
                <SelectTrigger id="producto" className={errors.producto ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccione un producto" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((product) => (
                    <SelectItem key={product.value} value={product.value}>
                      {product.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.producto && (
                <p className="text-xs text-red-500">{errors.producto.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plazo" className="text-sm font-medium">
                Plazo
              </Label>
              <Input
                id="plazo"
                type="number"
                {...register("plazo", { valueAsNumber: true })}
                placeholder="10"
                disabled={isBlocked}
                className={errors.plazo ? "border-red-500" : ""}
              />
              {errors.plazo && (
                <p className="text-xs text-red-500">{errors.plazo.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sección 3: Información del negocio */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-[#00505C]">Información del negocio</h3>
            <Separator className="bg-gray-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="moneda" className="text-sm font-medium">
                Moneda
              </Label>
              <Select
                disabled={isBlocked || isCatalogLoading}
                value={watch("moneda")}
                onValueChange={(value) => setValue("moneda", value, { shouldValidate: true })}
              >
                <SelectTrigger id="moneda" className={errors.moneda ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccione una moneda" />
                </SelectTrigger>
                <SelectContent>
                  {currenciesOptions.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.moneda && (
                <p className="text-xs text-red-500">{errors.moneda.message}</p>
              )}
              
              <div className="mt-2">
                <p className="text-sm font-medium mb-2">Valor del negocio</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>1. Si el negocio es Crea Patrimonio de Skandia....</p>
                  <p>2. Si tu cliente toma......</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perioricidad" className="text-sm font-medium">
                Periodicidad
              </Label>
              <Select
                disabled={isBlocked || isCatalogLoading}
                value={watch("perioricidad")}
                onValueChange={(value) => setValue("perioricidad", value, { shouldValidate: true })}
              >
                <SelectTrigger id="perioricidad" className={errors.perioricidad ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccione periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  {periodicitiesOptions.map((periodicity) => (
                    <SelectItem key={periodicity.value} value={periodicity.value}>
                      {periodicity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.perioricidad && (
                <p className="text-xs text-red-500">{errors.perioricidad.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor" className="text-sm font-medium">
                Valor
              </Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                {...register("valor", { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isBlocked}
                className={errors.valor ? "border-red-500" : ""}
              />
              {errors.valor && (
                <p className="text-xs text-red-500">{errors.valor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="agente" id="agente-label" className="text-sm font-medium">
                Agente
              </Label>
              <AgentAutocomplete
                value={watch("agente")}
                onChange={(value) => setValue("agente", value, { shouldValidate: true })}
                agents={agentsList}
                placeholder="Buscar agente..."
                aria-labelledby="agente-label"
                disabled={isBlocked || isCatalogLoading}
                className={errors.agente ? "border-red-500" : ""}
              />
              {errors.agente && (
                <p className="text-xs text-red-500">{errors.agente.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-[#00505C] hover:text-[#00505C] hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isBlocked || isCatalogLoading}
            className="bg-[#00505C] hover:bg-[#003d47] text-white"
          >
            {isSubmitting ? "Guardando..." : "Aceptar y Guardar"}
          </Button>
        </div>
      </form>
    </div>
  )
})

CreateBusinessForm.displayName = "CreateBusinessForm"
