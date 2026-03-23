'use client'

import { useEffect, useState } from 'react'

export function ProcesandoPreLiquidacion({
    onComplete,
}: {
    onComplete: () => void
}) {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress === 100) {
                    clearInterval(timer)
                    return 100
                }
                const diff = Math.random() * 10
                return Math.min(oldProgress + diff, 100)
            })
        }, 200)

        return () => {
            clearInterval(timer)
        }
    }, [])

    useEffect(() => {
        if (progress === 100) {
            const timeout = setTimeout(() => {
                onComplete()
            }, 500)
            return () => clearTimeout(timeout)
        }
    }, [progress, onComplete])

    return (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-lg border border-border shadow-sm">
            <div className="w-full max-w-md space-y-4">
                <div className="flex justify-between text-sm font-medium text-foreground">
                    <span>Procesando pre-liquidación...</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-center text-sm text-muted-foreground animate-pulse">
                    Calculando comisiones y distribuciones...
                </p>
            </div>
        </div>
    )
}
