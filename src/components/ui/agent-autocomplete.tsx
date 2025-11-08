"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface Agent {
  id: string
  nombre: string
  email?: string
  codigo?: string
}

export interface AgentAutocompleteProps {
  value?: string
  onChange?: (value: string) => void
  agents?: Agent[]
  placeholder?: string
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  disabled?: boolean
}

export function AgentAutocomplete({
  value = "",
  onChange,
  agents = [],
  placeholder = "Buscar agente...",
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  disabled = false,
}: AgentAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Inicializar el searchQuery con el valor actual cuando se abre el popover
  React.useEffect(() => {
    if (open && value) {
      // Si el popover se abre y hay un valor, inicializar la búsqueda con ese valor
      setSearchQuery(value)
    }
  }, [open, value])

  // Filtrar agentes basados en la búsqueda
  const filteredAgents = React.useMemo(() => {
    if (!searchQuery) return agents
    
    const query = searchQuery.toLowerCase()
    return agents.filter(
      (agent) =>
        agent.nombre.toLowerCase().includes(query) ||
        agent.codigo?.toLowerCase().includes(query) ||
        agent.email?.toLowerCase().includes(query)
    )
  }, [agents, searchQuery])

  // Encontrar el agente seleccionado
  const selectedAgent = agents.find((agent) => agent.id === value || agent.nombre === value)

  const handleSelect = (selectedValue: string) => {
    // Actualizar el valor seleccionado
    if (onChange) {
      onChange(selectedValue === value ? "" : selectedValue)
    }
    setOpen(false)
    setSearchQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value
            ? selectedAgent
              ? selectedAgent.nombre
              : value // Mostrar el nombre directamente si no hay agente seleccionado
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar agente por nombre, código o email..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {searchQuery.length >= 2
                ? "No se encontraron agentes"
                : "Ingrese al menos 2 caracteres para buscar"}
            </CommandEmpty>

            {filteredAgents.length > 0 && (
              <CommandGroup heading="Agentes">
                {filteredAgents.map((agent) => (
                  <CommandItem key={agent.id} value={agent.id} onSelect={() => handleSelect(agent.id)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === agent.id || value === agent.nombre
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{agent.nombre}</span>
                      {agent.codigo && (
                        <span className="text-xs text-muted-foreground">
                          {agent.codigo}
                          {agent.email && ` - ${agent.email}`}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

