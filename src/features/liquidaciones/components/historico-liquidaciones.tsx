'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ChevronDown, ChevronRight, Check, ChevronsUpDown, Search, X } from 'lucide-react';

import { useComisionesLiquidadas } from '../hooks/use-comisiones-liquidadas';
import { LiquidacionConRelaciones } from '../services/liquidacion.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/shared/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select';
import { Button } from '@/features/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/shared/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/features/shared/ui/command';
import { cn } from '@/lib/utils';

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
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

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

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

  const formatPercentage = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'percent', minimumFractionDigits: 2 }).format(value);

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

      <Card className="shadow-md">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
          <CardTitle className="text-lg">Detalle de Operaciones Liquidadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800">
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Contrato</TableHead>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Tipo</TableHead>
                  <TableHead className="text-right font-semibold">Valor Comisión</TableHead>
                  <TableHead className="text-right font-semibold w-[100px]">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.status === 'loading' && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        <span className="text-sm text-muted-foreground font-medium">Cargando liquidaciones...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {state.status === 'success' && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1 opacity-60">
                        <Search className="h-8 w-8 mb-2" />
                        <p className="font-medium">No hay liquidaciones en este periodo</p>
                        <p className="text-xs">Intenta ajustar los filtros de búsqueda</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {state.status === 'success' && data.map((comision: LiquidacionConRelaciones) => (
                  <React.Fragment key={comision.idSettlementCommission}>
                    <TableRow 
                      className={cn(
                        "cursor-pointer transition-colors duration-200",
                        expandedRows[comision.idSettlementCommission] ? "bg-primary/5 hover:bg-primary/5" : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleRow(comision.idSettlementCommission)}
                    >
                      <TableCell>
                        <div className={cn(
                          "flex items-center justify-center rounded-full h-6 w-6 transition-colors",
                          expandedRows[comision.idSettlementCommission] ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800"
                        )}>
                          {expandedRows[comision.idSettlementCommission] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{comision.settledDate ? format(new Date(comision.settledDate), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="font-bold text-slate-700 dark:text-slate-300">{comision.contract || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {comision.business?.client?.name} {comision.business?.client?.lastName}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 capitalize">
                          {(comision.commissionType as string).toLowerCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(Number(comision.commissionValue))}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs font-medium text-muted-foreground">{comision.comissionDistributions?.length || 0} dist.</span>
                      </TableCell>
                    </TableRow>
                    
                    {expandedRows[comision.idSettlementCommission] && (
                      <TableRow className="bg-slate-50/80 dark:bg-slate-900/30 animate-in fade-in zoom-in-95 duration-200">
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-6 border-y shadow-inner">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-bold text-sm flex items-center gap-2">
                                <span className="h-1 w-4 bg-primary rounded-full"></span>
                                Detalle de Distribución de Comisión
                              </h4>
                              <div className="flex gap-2">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                  Contrato: {comision.contract}
                                </span>
                              </div>
                            </div>

                            {/* Panel Informativo Superior */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-white dark:bg-slate-950 rounded-lg border shadow-sm border-t-2 border-t-primary">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Comisión Total</p>
                                  <p className="text-sm font-bold text-primary">{formatCurrency(Number(comision.commissionValue))}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Origen</p>
                                  <p className="text-xs font-medium">{comision.originCommission || '-'}</p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Categoría Asesor</p>
                                  <p className="text-xs font-medium">{comision.business?.user?.category?.name || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Asesor</p>
                                  <p className="text-xs font-medium truncate">
                                    {comision.business?.user?.name} {comision.business?.user?.lastName}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Producto</p>
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {comision.business?.productPercentageCommission?.productConfiguration?.product?.name || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Cliente</p>
                                  <p className="text-xs font-medium">
                                    {comision.business?.client?.name} {comision.business?.client?.lastName}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Table className="bg-white dark:bg-slate-950 rounded-lg border shadow-sm overflow-hidden">
                              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                                <TableRow>
                                  <TableHead className="font-bold text-xs">Categoría</TableHead>
                                  <TableHead className="font-bold text-xs text-center">Participante</TableHead>
                                  <TableHead className="text-right font-bold text-xs">% Dist. de Comisión</TableHead>
                                  <TableHead className="text-right font-bold text-xs">Comisión Bruta</TableHead>
                                  <TableHead className="text-right font-bold text-xs">% Descuento</TableHead>
                                  <TableHead className="text-right font-bold text-xs">Total Descuento</TableHead>
                                  <TableHead className="text-right font-bold text-xs">% Clawback</TableHead>
                                  <TableHead className="text-right font-bold text-xs">Descuento Clawback</TableHead>
                                  <TableHead className="text-right font-bold text-xs">Comisión Final</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {comision.comissionDistributions?.map((dist) => {
                                  // Lógica de derivación del participante
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
                                        if (manager) participant = `${(manager as any).name} ${(manager as any).lastName || ''}`.trim();
                                      }
                                    }
                                  }

                                  return (
                                    <TableRow key={dist.idComissionDistribution} className="hover:bg-muted/30 transition-colors">
                                      <TableCell className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                                        {catName}
                                      </TableCell>
                                      <TableCell className="text-xs font-medium text-center italic text-muted-foreground/80">
                                        {participant}
                                      </TableCell>
                                    <TableCell className="text-right text-xs font-medium text-slate-500">
                                      {formatPercentage(Number(dist.productPercentageCommissionCategory?.porcentajeDistribucion || 0))}
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-medium">
                                      {formatCurrency(Number(dist.valueComission))}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-amber-600 font-medium">
                                      {dist.appliedDiscountPercentage ? formatPercentage(Number(dist.appliedDiscountPercentage)) : '0%'}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-amber-600">
                                      {dist.totalDiscount && Number(dist.totalDiscount) > 0 ? `-${formatCurrency(Number(dist.totalDiscount))}` : '0'}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-red-500 font-medium">
                                      {dist.clawback ? formatPercentage(Number(dist.clawback.porcentajeApplied)) : '0%'}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-red-500">
                                      {dist.clawback ? `-${formatCurrency(Number(dist.clawback.valueClawback))}` : '0'}
                                    </TableCell>
                                      <TableCell className="text-right font-bold text-sm text-primary">
                                        {formatCurrency(Number(dist.valueComissionFinal))}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {(!comision.comissionDistributions || comision.comissionDistributions.length === 0) && (
                                  <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8 text-xs italic">
                                      No hay distribuciones registradas para esta liquidación
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
