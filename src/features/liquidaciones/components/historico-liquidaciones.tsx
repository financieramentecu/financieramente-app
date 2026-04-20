'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ChevronDown, ChevronRight, Check, ChevronsUpDown, Search, X } from 'lucide-react';

import { DataTable } from '@/features/shared/ui/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useComisionesLiquidadas } from '../hooks/use-comisiones-liquidadas';
import { LiquidacionConRelaciones } from '../services/liquidacion.service';
import { Button } from '@/features/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/shared/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/features/shared/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/features/shared/ui/command';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/features/shared/ui/card';

import { cn } from '@/lib/utils';
import { formatPercentFromFraction } from '@/features/shared/lib/format-percent';
import { getAppLocale } from '@/features/shared/lib/app-locale';

// Helper formatting functions
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

/**
 * Tabla interna para mostrar el detalle de las distribuciones de una comisión
 */
function DistributionDetailTable({ comision }: { comision: LiquidacionConRelaciones }) {
  const detailColumns = useMemo<ColumnDef<LiquidacionConRelaciones['comissionDistributions'][0]>[]>(
    () => [
      {
        accessorKey: 'productPercentageCommissionCategory.category.name',
        header: 'Categoría',
        cell: ({ row }) => (
          <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
            {row.original.productPercentageCommissionCategory?.category?.name || 'Desconocido'}
          </span>
        ),
      },
      {
        id: 'participant',
        header: () => <div className="text-center">Participante</div>,
        cell: ({ row }) => {
          const dist = row.original;
          const catName = dist.productPercentageCommissionCategory?.category?.name || 'Desconocido';
          const upperCat = catName.toUpperCase();

          let participant = '-';
          if (dist.clawback?.user) {
            participant = `${dist.clawback.user.name} ${dist.clawback.user.lastName || ''}`.trim();
          } else {
            const user = comision.business?.user;
            if (user) {
              if (upperCat.includes('GENERAL') || upperCat.includes('JUNIOR') || upperCat.includes('SENIOR')) {
                participant = `${user.name} ${user.lastName || ''}`.trim();
              } else if (upperCat.includes('LIDER') || upperCat.includes('LÍDER')) {
                const leader = user.leader;
                if (leader) participant = `${leader.name} ${leader.lastName || ''}`.trim();
              } else if (upperCat.includes('COACH')) {
                const coach = user.leader?.leader;
                if (coach) participant = `${coach.name} ${coach.lastName || ''}`.trim();
              } else if (upperCat.includes('AGENCIA') || upperCat.includes('TRINITY')) {
                const manager = user.leader?.leader?.leader || user.leader?.leader;
                if (manager) participant = `${manager.name} ${manager.lastName || ''}`.trim();
              }
            }
          }
          return (
            <div className="text-xs font-medium text-center italic text-muted-foreground/80">
              {participant}
            </div>
          );
        },
      },
      {
        id: 'porcentajeDistribucion',
        header: () => <div className="text-right">% Dist.</div>,
        cell: ({ row }) => (
          <div className="text-right text-xs font-medium text-slate-500">
            {formatPercentFromFraction(Number(row.original.productPercentageCommissionCategory?.porcentajeDistribucion || 0), getAppLocale())}
          </div>
        ),
      },
      {
        accessorKey: 'valueComission',
        header: () => <div className="text-right">Com. Bruta</div>,
        cell: ({ row }) => (
          <div className="text-right text-xs font-medium">
            {formatCurrency(Number(row.original.valueComission))}
          </div>
        ),
      },
      {
        accessorKey: 'appliedDiscountPercentage',
        header: () => <div className="text-right">% Desc.</div>,
        cell: ({ row }) => (
          <div className="text-right text-xs text-amber-600 font-medium">
            {row.original.appliedDiscountPercentage
              ? formatPercentFromFraction(Number(row.original.appliedDiscountPercentage), getAppLocale())
              : formatPercentFromFraction(0, getAppLocale())}
          </div>
        ),
      },
      {
        accessorKey: 'totalDiscount',
        header: () => <div className="text-right">Total Desc.</div>,
        cell: ({ row }) => (
          <div className="text-right text-xs text-amber-600">
            {row.original.totalDiscount && Number(row.original.totalDiscount) > 0
              ? `-${formatCurrency(Number(row.original.totalDiscount))}`
              : '0'}
          </div>
        ),
      },
      {
        id: 'porcentajeClawback',
        header: () => <div className="text-right">% Clawback</div>,
        cell: ({ row }) => (
          <div className="text-right text-xs text-red-500 font-medium">
            {row.original.clawback
              ? formatPercentFromFraction(Number(row.original.clawback.porcentajeApplied), getAppLocale())
              : formatPercentFromFraction(0, getAppLocale())}
          </div>
        ),
      },
      {
        id: 'valorClawback',
        header: () => <div className="text-right">Clawback</div>,
        cell: ({ row }) => (
          <div className="text-right text-xs text-red-500">
            {row.original.clawback
              ? `-${formatCurrency(Number(row.original.clawback.valueClawback))}`
              : '0'}
          </div>
        ),
      },
      {
        accessorKey: 'valueComissionFinal',
        header: () => <div className="text-right">Com. Final</div>,
        cell: ({ row }) => (
          <div className="text-right font-bold text-sm text-primary">
            {formatCurrency(Number(row.original.valueComissionFinal))}
          </div>
        ),
      },
    ],
    [comision]
  );

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-white dark:bg-slate-950">
      <DataTable
        columns={detailColumns}
        data={comision.comissionDistributions || []}
        paginable={false}
        searchable={false}
        emptyMessage="No hay distribuciones registradas para esta liquidación"
      />
    </div>
  );
}

export function HistoricoLiquidaciones() {
  const {
    state,
    contratos,
    coaches,
    fetchComisiones,
    fetchContratos,
    fetchCoaches
  } = useComisionesLiquidadas();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth() + 1 + '');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear() + '');
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedCoach, setSelectedCoach] = useState<number | null>(null);
  const [openContract, setOpenContract] = useState(false);
  const [openCoach, setOpenCoach] = useState(false);

  useEffect(() => {
    fetchContratos();
    fetchCoaches();
  }, [fetchContratos, fetchCoaches]);

  useEffect(() => {
    fetchComisiones({
      month: parseInt(selectedMonth),
      year: parseInt(selectedYear),
      contract: selectedContract || undefined,
      coachId: selectedCoach || undefined
    });
  }, [selectedMonth, selectedYear, selectedContract, selectedCoach, fetchComisiones]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);


  const columns: ColumnDef<LiquidacionConRelaciones>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => row.toggleExpanded()}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      ),
    },
    {
      accessorKey: 'settledDate',
      header: 'Fecha',
      cell: ({ row }) => row.original.settledDate ? format(new Date(row.original.settledDate), 'dd/MM/yyyy') : '-',
    },
    {
      accessorKey: 'contract',
      header: 'Contrato',
      cell: ({ row }) => <span className="font-bold">{row.original.contract || '-'}</span>,
    },
    {
      id: 'client',
      header: 'Cliente',
      cell: ({ row }) => {
        const client = row.original.business?.client;
        return client ? `${client.name} ${client.lastName}` : '-';
      },
    },
    {
      accessorKey: 'commissionType',
      header: 'Tipo',
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 capitalize">
          {(row.original.commissionType as string).toLowerCase()}
        </span>
      ),
    },
    {
      accessorKey: 'commissionValue',
      header: () => <div className="text-right">Valor Comisión</div>,
      cell: ({ row }) => (
        <div className="text-right font-bold text-primary">
          {formatCurrency(Number(row.original.commissionValue))}
        </div>
      ),
    },
    {
      id: 'detailInfo',
      header: () => <div className="text-right w-[100px]">Detalle</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <span className="text-xs font-medium text-muted-foreground">{row.original.comissionDistributions?.length || 0} dist.</span>
        </div>
      ),
    },
  ];

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: format(new Date(2000, i, 1), 'MMMM', { locale: es })
  }));

  const data = state.data?.comisiones || [];
  const metrics = state.data?.metrics || { totalSettled: 0, totalClawbacks: 0, count: 0 };
  const coachesList = coaches || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase text-muted-foreground ml-1">Periodo</label>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[150px] capitalize bg-slate-50 dark:bg-slate-800">
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value} className="capitalize">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px] bg-slate-50 dark:bg-slate-800">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold uppercase text-muted-foreground ml-1 text-[10px] tracking-tight">Filtrar por Contrato</label>
          <div className="relative flex items-center">
            <Popover open={openContract} onOpenChange={setOpenContract}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openContract}
                  className={cn(
                    "w-full justify-between bg-slate-50 dark:bg-slate-800 pr-10 truncate",
                    selectedContract && "border-primary/50 ring-1 ring-primary/20"
                  )}
                >
                  <div className="flex items-center overflow-hidden">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-primary" />
                    <span className="truncate">
                      {selectedContract || "Buscar contrato..."}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Número de contrato..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron contratos.</CommandEmpty>
                    <CommandGroup>
                      {(contratos || []).map((contract) => (
                        <CommandItem
                          key={contract}
                          value={contract}
                          onSelect={(currentValue) => {
                            setSelectedContract(currentValue === selectedContract ? "" : currentValue);
                            setOpenContract(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedContract === contract ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {contract}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedContract && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedContract('');
                }}
                className="absolute right-8 h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-transparent"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold uppercase text-muted-foreground ml-1 text-[10px] tracking-tight">Filtrar por Coach</label>
          <div className="relative flex items-center">
            <Popover open={openCoach} onOpenChange={setOpenCoach}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCoach}
                  className={cn(
                    "w-full justify-between bg-slate-50 dark:bg-slate-800 pr-10 truncate",
                    selectedCoach && "border-primary/50 ring-1 ring-primary/20"
                  )}
                >
                  <div className="flex items-center overflow-hidden">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-primary" />
                    <span className="truncate text-xs">
                      {selectedCoach
                        ? coachesList.find((c) => c.id === selectedCoach)?.fullName
                        : "Seleccionar Coach..."}
                    </span>
                  </div>
                  <Check className={cn("ml-2 h-4 w-4 shrink-0 opacity-50", selectedCoach ? "opacity-100" : "opacity-0")} />
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar coach..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron coaches.</CommandEmpty>
                    <CommandGroup>
                      {coachesList.map((coach: { id: number; fullName: string; category: string }) => (
                        <CommandItem
                          key={coach.id}
                          value={coach.fullName}
                          onSelect={() => {
                            setSelectedCoach(coach.id === selectedCoach ? null : coach.id);
                            setOpenCoach(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCoach === coach.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{coach.fullName}</span>
                            <span className="text-[10px] text-muted-foreground">{coach.category}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedCoach && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCoach(null);
                }}
                className="absolute right-8 h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-transparent"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Liquidado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.totalSettled)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Comisiones abonadas este periodo</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Clawbacks / Descuentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(metrics.totalClawbacks)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Total deducciones aplicadas</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Operaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.count}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Número de liquidaciones generadas</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
          <CardTitle className="text-lg">Detalle de Operaciones Liquidadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data}
            loading={state.status === 'loading'}
            searchable={false}
            paginable={false}
            emptyMessage="No hay liquidaciones en este periodo"
            getRowCanExpand={() => true}
            renderSubComponent={({ row }: { row: { original: LiquidacionConRelaciones } }) => (
              <div className="p-6 bg-slate-50/80 dark:bg-slate-900/30 border-y shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <span className="h-1 w-4 bg-primary rounded-full"></span>
                    Detalle de Distribución de Comisión
                  </h4>
                  <div className="flex gap-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      Contrato: {row.original.contract}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-white dark:bg-slate-950 rounded-lg border shadow-sm border-t-2 border-t-primary">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Comisión Total</p>
                      <p className="text-sm font-bold text-primary">{formatCurrency(Number(row.original.commissionValue))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Origen</p>
                      <p className="text-xs font-medium">{row.original.originCommission || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Categoría Asesor</p>
                      <p className="text-xs font-medium">{row.original.business?.user?.category?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Asesor</p>
                      <p className="text-xs font-medium truncate">
                        {row.original.business?.user?.name} {row.original.business?.user?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Producto</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {row.original.business?.productPercentageCommission?.productConfiguration?.product?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Cliente</p>
                      <p className="text-xs font-medium">
                        {row.original.business?.client?.name} {row.original.business?.client?.lastName}
                      </p>
                    </div>
                  </div>
                </div>

                <DistributionDetailTable comision={row.original} />
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
