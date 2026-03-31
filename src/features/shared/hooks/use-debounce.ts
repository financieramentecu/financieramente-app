import { useState, useEffect } from 'react'

/**
 * Hook para hacer debounce de un valor
 * Útil para búsquedas en tiempo real sin hacer demasiadas llamadas
 *
 * @param value - Valor a hacer debounce
 * @param delay - Delay en milisegundos (default: 500ms)
 * @returns Valor con debounce aplicado
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        // Set up the timeout
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        // Clean up the timeout if value changes before delay
        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}
