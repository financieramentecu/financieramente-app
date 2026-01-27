'use client'

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/features/shared/ui/dialog'
import { Button } from '@/features/shared/ui/button'
import { X } from 'lucide-react'
import type { ArchivoDisponible } from '@/features/pre-liquidacion/types/types'

interface ModalConfirmacionPreLiquidacionProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    archivo?: ArchivoDisponible
    onConfirmar: () => void
    isProcesando: boolean
    mesSeleccionado?: string
}

/**
 * Modal de confirmación para procesar pre-liquidación
 */
export function ModalConfirmacionPreLiquidacion({
    open,
    onOpenChange,
    archivo,
    onConfirmar,
    isProcesando,
    mesSeleccionado,
}: ModalConfirmacionPreLiquidacionProps) {
    if (!archivo) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-6 gap-6">
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>

                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#00505C] flex items-center gap-2">
                        Confirmar Pre-liquidación
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <p className="text-gray-600">
                        ¿Está seguro de que desea procesar la pre-liquidación del archivo{' '}
                        <span className="font-semibold text-gray-900">
                            “{archivo.nombreArchivo}”
                        </span>?
                    </p>

                    {mesSeleccionado && (
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                            <p className="text-sm text-blue-800 font-medium">
                                Se liquidará para el periodo: <span className="font-bold">{mesSeleccionado}</span>
                            </p>
                        </div>
                    )}

                    <p className="text-sm text-gray-500">
                        Se procesarán los registros sincronizados dentro del mes seleccionado, aplicando las fórmulas de distribución configuradas.
                    </p>
                </div>

                <DialogFooter className="gap-3 sm:gap-0 mt-6">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isProcesando}
                        className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirmar}
                        disabled={isProcesando}
                        className="w-full sm:w-auto font-semibold text-white bg-[#8dd67a] hover:bg-[#7bc469]"
                    >
                        {isProcesando ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Procesando...
                            </>
                        ) : (
                            'Confirmar y Liquidar'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
