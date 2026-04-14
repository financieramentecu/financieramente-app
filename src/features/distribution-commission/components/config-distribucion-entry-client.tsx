'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'
import { productConfigurationApi } from '@/features/product-configuration/lib/product-configuration-api'
import type { ProductConfiguration } from '@/features/product-configuration/types/product-configuration.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Loader2 } from 'lucide-react'

export function ConfigDistribucionEntryClient() {
	const router = useRouter()
	const [query, setQuery] = useState('')
	const debounced = useDebounce(query, 400)
	const [state, setState] = useState<
		AsyncState<{ configurations: ProductConfiguration[] }>
	>({ status: 'idle', data: undefined, error: '' })

	useEffect(() => {
		const q = debounced.trim()
		if (q.length < 2) {
			setState({ status: 'idle', data: undefined, error: '' })
			return
		}

		let cancelled = false
		setState((prev) => ({
			...prev,
			status: 'loading',
			data: undefined,
			error: '',
		}))

		void (async () => {
			const res = await productConfigurationApi.getProductConfigurations({
				search: q,
				page: 1,
				pageSize: 50,
			})
			if (cancelled) return
			if (res.data) {
				setState({
					status: 'success',
					data: { configurations: res.data.configurations },
					error: '',
				})
			} else {
				setState({
					status: 'error',
					data: undefined,
					error: res.error ?? 'Error al buscar',
				})
			}
		})()

		return () => {
			cancelled = true
		}
	}, [debounced])

	const handleSelect = (config: ProductConfiguration) => {
		router.push(
			`/dashboard/config-distribucion-comisiones/${encodeURIComponent(config.code)}/reglas`
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">
					Config. distribución de comisiones
				</h2>
				<p className="text-muted-foreground text-sm">
					Busca por código o por producto/origen/categoría. Luego abre las reglas
					de esa configuración.
				</p>
			</div>

			<div className="rounded-md border p-4">
				<label className="mb-2 block text-sm font-medium" htmlFor="code-search">
					Buscar configuración
				</label>
				<Input
					id="code-search"
					placeholder="Mínimo 2 caracteres (ej. código o nombre de producto)"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					autoComplete="off"
				/>

				{query.trim().length > 0 && query.trim().length < 2 && (
					<p className="text-muted-foreground mt-3 text-sm">
						Escribe al menos 2 caracteres para buscar.
					</p>
				)}

				{state.status === 'loading' && (
					<div className="flex items-center gap-2 py-8 text-muted-foreground">
						<Loader2 className="h-5 w-5 animate-spin" />
						Buscando…
					</div>
				)}

				{state.status === 'error' && (
					<p className="text-destructive mt-4 text-sm">{state.error}</p>
				)}

				{state.status === 'success' &&
					state.data.configurations.length === 0 && (
						<p className="text-muted-foreground mt-4 text-sm">
							No hay configuraciones que coincidan. Prueba otro código o nombre.
						</p>
					)}

				{state.status === 'success' &&
					state.data.configurations.length > 0 && (
						<ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
							{state.data.configurations.map((c) => (
								<li key={c.id}>
									<Button
										variant="outline"
										className="h-auto w-full justify-start py-3 text-left"
										onClick={() => handleSelect(c)}
									>
										<span className="font-mono text-sm font-semibold">
											{c.code}
										</span>
										<span className="text-muted-foreground ml-2 text-xs">
											{c.product.name} · {c.clientOrigin.name} ·{' '}
											{c.category.name}
										</span>
									</Button>
								</li>
							))}
						</ul>
					)}

				{state.status === 'idle' && query.trim().length < 2 && (
					<p className="text-muted-foreground mt-4 text-sm">
						Aún no hay resultados. Usa el buscador para encontrar la configuración
						por código o nombre.
					</p>
				)}
			</div>
		</div>
	)
}
