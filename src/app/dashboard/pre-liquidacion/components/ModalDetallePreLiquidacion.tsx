'use client'

import { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/features/shared/ui/dialog'
import { Button } from '@/features/shared/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { FileText, Users, Check, X } from 'lucide-react'

interface ModalDetallePreLiquidacionProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    fileId: number | null
    onConfirmar: () => void
    isProcesando: boolean
}

interface RegistroDetalle {
    idSettlementCommission: number
    idBusiness: number | null
    producto: string | null
    esRezagado: boolean
    nombreCliente: string | null
    cedulaAgente: string
    nombreAgente: string
    numeroContrato: string | null
    tipoComision: string | null
    comision: number
    generalBruta: number
    generalDescuento: number
    agenciaBruta: number
    agenciaDescuento: number
    liderBruta: number
    liderDescuento: number
    coachBruta: number
    coachDescuento: number
    estado: string
}

interface DetalleData {
    archivo: {
        nombreArchivo: string
        totalRegistros: number
        sincronizados: number
        rezagados: number
    }
    registros: RegistroDetalle[]
    distribucion: Array<{
        nombreAgente: string
        cedulaAgente: string
        totalComision: number
        totalGeneral: number
        totalAgencia: number
        totalLider: number
        totalCoach: number
        cantidadRegistros: number
        sincronizados: number
        rezagados: number
    }>
    resumen: {
        totalRegistros: number
        sincronizados: number
        rezagados: number
        totalComision: number
        totalGeneral: number
        totalAgencia: number
        totalLider: number
        totalCoach: number
    }
}

export function ModalDetallePreLiquidacion({
    open,
    onOpenChange,
    fileId,
    onConfirmar,
    isProcesando,
}: ModalDetallePreLiquidacionProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [data, setData] = useState<DetalleData | null>(null)
    const [error, setError] = useState<string | null>(null)

    const fetchDetalle = async () => {
        if (!fileId) return

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/pre-liquidacion/detalle/${fileId}`)

            if (!response.ok) {
                const errorData = await response.json()
                setError(errorData.error || 'Error al cargar detalle')
                return
            }

            const result = await response.json()
            setData(result)
        } catch (err) {
            console.error('Error al cargar detalle:', err)
            setError('Error al cargar detalle del archivo')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (open && fileId) {
            fetchDetalle()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, fileId])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#00505C]" />
                        Detalle de Pre-liquidación
                    </DialogTitle>
                    <DialogDescription>
                        {data && (
                            <span className="font-semibold text-gray-900">
                                {data.archivo.nombreArchivo}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00505C] mx-auto"></div>
                        <p className="text-muted-foreground mt-4">Cargando detalle...</p>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-md">
                        <p>{error}</p>
                    </div>
                ) : data ? (
                    <div className="space-y-4">
                        {/* Resumen */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-xs text-blue-600">Total Registros</p>
                                <p className="text-lg font-bold text-blue-900">{data.resumen.totalRegistros}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                                <p className="text-xs text-green-600">Sincronizados</p>
                                <p className="text-lg font-bold text-green-900">{data.resumen.sincronizados}</p>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-lg">
                                <p className="text-xs text-amber-600">Rezagados</p>
                                <p className="text-lg font-bold text-amber-900">{data.resumen.rezagados}</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                                <p className="text-xs text-purple-600">Total Comisión</p>
                                <p className="text-sm font-bold text-purple-900">{formatCurrency(data.resumen.totalComision)}</p>
                            </div>
                            <div className="bg-teal-50 p-3 rounded-lg">
                                <p className="text-xs text-teal-600">General Neto</p>
                                <p className="text-sm font-bold text-teal-900">{formatCurrency(data.resumen.totalGeneral)}</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <Tabs defaultValue="registros" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="registros">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Registros ({data.registros.length})
                                </TabsTrigger>
                                <TabsTrigger value="distribucion">
                                    <Users className="h-4 w-4 mr-2" />
                                    Distribución por Agente ({data.distribucion.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="registros" className="mt-4">
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="max-h-[50vh] overflow-x-auto overflow-y-auto">
                                        <table className="w-full text-[10px]">
                                            <thead className="bg-gray-100 sticky top-0">
                                                <tr>
                                                    <th className="text-left py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">ID</th>
                                                    <th className="text-left py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">Producto</th>
                                                    <th className="text-center py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">Rezagado</th>
                                                    <th className="text-left py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">Cliente</th>
                                                    <th className="text-left py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">Cédula Agente</th>
                                                    <th className="text-left py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">Agente</th>
                                                    <th className="text-left py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">Contrato</th>
                                                    <th className="text-left py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">Tipo</th>
                                                    <th className="text-right py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">Comisión</th>
                                                    <th className="text-right py-2 px-1 font-semibold text-blue-700 whitespace-nowrap">Gen Bruta</th>
                                                    <th className="text-right py-2 px-1 font-semibold text-blue-700 whitespace-nowrap">Gen Desc</th>
                                                    <th className="text-right py-2 px-1 font-semibold text-teal-700 whitespace-nowrap">Ag Bruta</th>
                                                    <th className="text-right py-2 px-1 font-semibold text-teal-700 whitespace-nowrap">Ag Desc</th>
                                                    <th className="text-right py-2 px-1 font-semibold text-indigo-700 whitespace-nowrap">Lid Bruta</th>
                                                    <th className="text-right py-2 px-1 font-semibold text-indigo-700 whitespace-nowrap">Lid Desc</th>
                                                    <th className="text-right py-2 px-1 font-semibold text-pink-700 whitespace-nowrap">Co Bruta</th>
                                                    <th className="text-right py-2 px-1 font-semibold text-pink-700 whitespace-nowrap">Co Desc</th>
                                                    <th className="text-center py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.registros.map((registro) => (
                                                    <tr
                                                        key={registro.idSettlementCommission}
                                                        className="border-t hover:bg-gray-50"
                                                    >
                                                        <td className="py-1 px-1">{registro.idSettlementCommission}</td>
                                                        <td className="py-1 px-1 max-w-[100px] truncate" title={registro.producto || ''}>
                                                            {registro.producto || '-'}
                                                        </td>
                                                        <td className="py-1 px-1 text-center">
                                                            {registro.esRezagado ? (
                                                                <Check className="h-4 w-4 text-amber-600 mx-auto" />
                                                            ) : (
                                                                <X className="h-4 w-4 text-gray-400 mx-auto" />
                                                            )}
                                                        </td>
                                                        <td className="py-1 px-1 max-w-[100px] truncate" title={registro.nombreCliente || ''}>
                                                            {registro.nombreCliente || '-'}
                                                        </td>
                                                        <td className="py-1 px-1">{registro.cedulaAgente || '-'}</td>
                                                        <td className="py-1 px-1 max-w-[100px] truncate" title={registro.nombreAgente}>
                                                            {registro.nombreAgente || '-'}
                                                        </td>
                                                        <td className="py-1 px-1">{registro.numeroContrato || '-'}</td>
                                                        <td className="py-1 px-1 max-w-[80px] truncate" title={registro.tipoComision || ''}>
                                                            {registro.tipoComision || '-'}
                                                        </td>
                                                        <td className="py-1 px-1 text-right font-medium">
                                                            {formatCurrency(registro.comision)}
                                                        </td>
                                                        <td className="py-1 px-1 text-right text-blue-700">
                                                            {formatCurrency(registro.generalBruta)}
                                                        </td>
                                                        <td className="py-1 px-1 text-right text-blue-700 font-medium">
                                                            {formatCurrency(registro.generalDescuento)}
                                                        </td>
                                                        <td className="py-1 px-1 text-right text-teal-700">
                                                            {formatCurrency(registro.agenciaBruta)}
                                                        </td>
                                                        <td className="py-1 px-1 text-right text-teal-700 font-medium">
                                                            {formatCurrency(registro.agenciaDescuento)}
                                                        </td>
                                                        <td className="py-1 px-1 text-right text-indigo-700">
                                                            {formatCurrency(registro.liderBruta)}
                                                        </td>
                                                        <td className="py-1 px-1 text-right text-indigo-700 font-medium">
                                                            {formatCurrency(registro.liderDescuento)}
                                                        </td>
                                                        <td className="py-1 px-1 text-right text-pink-700">
                                                            {formatCurrency(registro.coachBruta)}
                                                        </td>
                                                        <td className="py-1 px-1 text-right text-pink-700 font-medium">
                                                            {formatCurrency(registro.coachDescuento)}
                                                        </td>
                                                        <td className="py-1 px-1 text-center">
                                                            <span
                                                                className={`px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap ${registro.estado === 'SINCRONIZADO'
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : 'bg-amber-100 text-amber-700'
                                                                    }`}
                                                            >
                                                                {registro.estado === 'SINCRONIZADO' ? 'SYNC' : 'LAG'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="distribucion" className="mt-4">
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="max-h-[50vh] overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-100 sticky top-0">
                                                <tr>
                                                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Agente</th>
                                                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Cédula</th>
                                                    <th className="text-right py-2 px-2 font-semibold text-gray-700">Registros</th>
                                                    <th className="text-right py-2 px-2 font-semibold text-green-700">Sync</th>
                                                    <th className="text-right py-2 px-2 font-semibold text-amber-700">Lag</th>
                                                    <th className="text-right py-2 px-2 font-semibold text-blue-700">General</th>
                                                    <th className="text-right py-2 px-2 font-semibold text-teal-700">Agencia</th>
                                                    <th className="text-right py-2 px-2 font-semibold text-indigo-700">Líder</th>
                                                    <th className="text-right py-2 px-2 font-semibold text-pink-700">Coach</th>
                                                    <th className="text-right py-2 px-2 font-semibold text-gray-700">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.distribucion.map((dist, idx) => (
                                                    <tr key={idx} className="border-t hover:bg-gray-50">
                                                        <td className="py-2 px-2 font-medium">{dist.nombreAgente}</td>
                                                        <td className="py-2 px-2">{dist.cedulaAgente}</td>
                                                        <td className="py-2 px-2 text-right">{dist.cantidadRegistros}</td>
                                                        <td className="py-2 px-2 text-right text-green-600">{dist.sincronizados}</td>
                                                        <td className="py-2 px-2 text-right text-amber-600">{dist.rezagados}</td>
                                                        <td className="py-2 px-2 text-right text-blue-700 font-medium">
                                                            {formatCurrency(dist.totalGeneral)}
                                                        </td>
                                                        <td className="py-2 px-2 text-right text-teal-700 font-medium">
                                                            {formatCurrency(dist.totalAgencia)}
                                                        </td>
                                                        <td className="py-2 px-2 text-right text-indigo-700 font-medium">
                                                            {formatCurrency(dist.totalLider)}
                                                        </td>
                                                        <td className="py-2 px-2 text-right text-pink-700 font-medium">
                                                            {formatCurrency(dist.totalCoach)}
                                                        </td>
                                                        <td className="py-2 px-2 text-right font-bold">
                                                            {formatCurrency(dist.totalComision)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50 font-bold">
                                                <tr>
                                                    <td colSpan={3} className="py-2 px-2 text-right">TOTALES:</td>
                                                    <td className="py-2 px-2 text-right text-green-700">
                                                        {data.distribucion.reduce((s, d) => s + d.sincronizados, 0)}
                                                    </td>
                                                    <td className="py-2 px-2 text-right text-amber-700">
                                                        {data.distribucion.reduce((s, d) => s + d.rezagados, 0)}
                                                    </td>
                                                    <td className="py-2 px-2 text-right text-blue-700">
                                                        {formatCurrency(data.resumen.totalGeneral)}
                                                    </td>
                                                    <td className="py-2 px-2 text-right text-teal-700">
                                                        {formatCurrency(data.resumen.totalAgencia)}
                                                    </td>
                                                    <td className="py-2 px-2 text-right text-indigo-700">
                                                        {formatCurrency(data.resumen.totalLider)}
                                                    </td>
                                                    <td className="py-2 px-2 text-right text-pink-700">
                                                        {formatCurrency(data.resumen.totalCoach)}
                                                    </td>
                                                    <td className="py-2 px-2 text-right">
                                                        {formatCurrency(data.resumen.totalComision)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : null}

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isProcesando}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirmar}
                        disabled={isProcesando || !data}
                        className="bg-[#00505C] hover:bg-[#003d47]"
                    >
                        {isProcesando ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Procesando...
                            </>
                        ) : (
                            'Confirmar Pre-Liquidación'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
