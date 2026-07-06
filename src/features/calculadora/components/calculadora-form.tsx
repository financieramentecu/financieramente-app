'use client'

import React, { useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { Card, CardContent } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/features/shared/ui/alert'
import { AlertCircle } from 'lucide-react'
import { getProductDistribution } from '@/features/calculadora/actions/get-product-distribution'

const formSchema = z.object({
	idCompany: z.number({ message: 'Seleccione una compañía' }).positive('Seleccione una compañía'),
	idProduct: z.number({ message: 'Seleccione un producto' }).positive('Seleccione un producto'),
	idClientOrigin: z.number({ message: 'Seleccione un origen' }).positive('Seleccione un origen'),
	/** El nivel hasta donde el usuario quiere ver el desglose */
	idLevelView: z.number({ message: 'Seleccione el nivel a visualizar' }).positive('Seleccione el nivel a visualizar'),
	/** El nivel del MS que realmente vendió (define la distribución) */
	idLevelOrigin: z.number({ message: 'Seleccione el nivel que vendió' }).positive('Seleccione el nivel que vendió'),
	montoVenta: z.number({ message: 'Ingrese un monto válido' }).positive('Ingrese un monto válido mayor a 0'),
	currency: z.enum(['USD', 'COP']),
	descuento: z.number({ message: 'Debe ser un número' }).min(0).max(100),
	clawback: z.number({ message: 'Debe ser un número' }).min(0).max(100),
})

export type CalculadoraFormData = z.infer<typeof formSchema>

interface CalculadoraFormProps {
	companies: { idCompany: number; name: string; currency?: { symbol: string | null } | null }[]
	products: { idProduct: number; name: string; idCompany: number; commissionPercentage?: number; discountPercentage?: number | null; clawbackPercentage?: number | null }[]
	origins: { idClientOrigin: number; name: string }[]
	levels: { idLevel: number; name: string; code?: string; idNextLevel?: number | null }[]
	userRole?: string
	userLevelId?: number | null
	onSubmit: (data: CalculadoraFormData) => void
	onClear: () => void
	onChange?: (data: { distributionData: { levelCode: string, levelName: string, porcentaje: number }[] }) => void
	isPending: boolean
}

export function CalculadoraForm({
	companies,
	products,
	origins,
	levels,
	userRole,
	userLevelId,
	onSubmit,
	onClear,
	onChange,
	isPending,
}: CalculadoraFormProps) {
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = useForm<CalculadoraFormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			idCompany: undefined,
			idProduct: undefined,
			idClientOrigin: undefined,
			idLevelView: userRole !== 'ADMIN' && userLevelId ? userLevelId : undefined,
			idLevelOrigin: undefined,
			montoVenta: undefined,
			currency: 'USD',
			descuento: 12,
			clawback: 0,
		},
	})

	const selectedCompanyId = watch('idCompany')

	const filteredProducts = useMemo(() => {
		if (!selectedCompanyId) return []
		return products.filter((p) => p.idCompany === selectedCompanyId)
	}, [products, selectedCompanyId])

	// Reset product and set currency when company changes
	useEffect(() => {
		if (selectedCompanyId) {
			setValue('idProduct', 0 as unknown as number)
			const company = companies.find((c) => c.idCompany === selectedCompanyId)
			if (company?.currency?.symbol) {
				setValue('currency', company.currency.symbol as 'USD' | 'COP')
			}
		}
	}, [selectedCompanyId, setValue, companies])

	const selectedProductId = watch('idProduct')
	const selectedLevelViewId = watch('idLevelView')
	const selectedLevelOriginId = watch('idLevelOrigin')

	const sellLevels = useMemo(() => {
		if (!selectedLevelViewId) return []
		// Respeta la lógica de filtrar hacia abajo desde "Tu Nivel" para todos los roles
		const allowedSellIds = new Set<number>()
		allowedSellIds.add(selectedLevelViewId)

		let addedNew = true
		while (addedNew) {
			addedNew = false
			for (const lvl of levels) {
				if (!allowedSellIds.has(lvl.idLevel) && lvl.idNextLevel && allowedSellIds.has(lvl.idNextLevel)) {
					allowedSellIds.add(lvl.idLevel)
					addedNew = true
				}
			}
		}

		return levels.filter(l => allowedSellIds.has(l.idLevel))
	}, [levels, selectedLevelViewId])

	// Si el nivel de origen seleccionado ya no es válido, resetearlo
	useEffect(() => {
		if (selectedLevelViewId && selectedLevelOriginId) {
			const isValid = sellLevels.some(l => l.idLevel === selectedLevelOriginId)
			if (!isValid) {
				setValue('idLevelOrigin', 0 as unknown as number)
			}
		}
	}, [selectedLevelViewId, selectedLevelOriginId, sellLevels, setValue])

	const [distributionHasConfig, setDistributionHasConfig] = React.useState<boolean>(true)

	// Carga el clawback del producto/nivel al cambiar la selección
	useEffect(() => {
		const updateDistribution = async () => {
			if (selectedProductId && selectedLevelOriginId) {
				const res = await getProductDistribution(selectedProductId, selectedLevelOriginId)
				// Siempre aplicar el clawback (viene de CommissionDiscount incluso si success=false)
				setValue('clawback', res.clawbackPercentage ?? 10)
				if (res.success && res.data && res.data.length > 0) {
					setDistributionHasConfig(true)
					if (onChange) {
						onChange({ distributionData: res.data })
					}
				} else {
					setDistributionHasConfig(false)
					if (onChange) {
						onChange({ distributionData: [] })
					}
				}
			} else {
				setDistributionHasConfig(true)
				if (onChange) {
					onChange({ distributionData: [] })
				}
			}
		}

		updateDistribution()
	}, [selectedProductId, selectedLevelOriginId, setValue, onChange])

	const selectedProduct = useMemo(() => {
		if (!selectedProductId) return null;
		return products.find(p => p.idProduct === selectedProductId) || null;
	}, [products, selectedProductId])

	const productHasZeroCommission = selectedProduct ? (selectedProduct.commissionPercentage === 0 || selectedProduct.commissionPercentage == null) : false;

	const handleClear = () => {
		reset()
		onClear()
	}

	return (
		<Card className="border shadow-sm">
			<CardContent className="pt-6">
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
					<div className="space-y-4">
						{/* Company */}
						<div className="space-y-2">
							<Label htmlFor="idCompany">Compañía</Label>
							<Select
								value={watch('idCompany')?.toString() || ''}
								onValueChange={(val) => setValue('idCompany', Number(val))}
							>
								<SelectTrigger
									className={errors.idCompany ? 'border-destructive' : ''}
								>
									<SelectValue placeholder="Seleccione compañía..." />
								</SelectTrigger>
								<SelectContent>
									{companies.map((c) => (
										<SelectItem key={c.idCompany} value={c.idCompany.toString()}>
											{c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.idCompany && (
								<p className="text-sm text-destructive">
									{errors.idCompany.message}
								</p>
							)}
						</div>

						{/* Product */}
						<div className="space-y-2">
							<Label htmlFor="idProduct">Producto</Label>
							<Select
								value={watch('idProduct')?.toString() || ''}
								onValueChange={(val) => setValue('idProduct', Number(val))}
								disabled={!selectedCompanyId || filteredProducts.length === 0}
							>
								<SelectTrigger
									className={errors.idProduct ? 'border-destructive' : ''}
								>
									<SelectValue placeholder="Seleccione producto..." />
								</SelectTrigger>
								<SelectContent>
									{filteredProducts.map((p) => (
										<SelectItem key={p.idProduct} value={p.idProduct.toString()}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.idProduct && (
								<p className="text-sm text-destructive">
									{errors.idProduct.message}
								</p>
							)}
						</div>

						{/* Origin */}
						<div className="space-y-2">
							<Label htmlFor="idClientOrigin">Origen</Label>
							<Select
								value={watch('idClientOrigin')?.toString() || ''}
								onValueChange={(val) => setValue('idClientOrigin', Number(val))}
							>
								<SelectTrigger
									className={errors.idClientOrigin ? 'border-destructive' : ''}
								>
									<SelectValue placeholder="Seleccione origen..." />
								</SelectTrigger>
								<SelectContent>
									{origins.map((o) => (
										<SelectItem
											key={o.idClientOrigin}
											value={o.idClientOrigin.toString()}
										>
											{o.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.idClientOrigin && (
								<p className="text-sm text-destructive">
									{errors.idClientOrigin.message}
								</p>
							)}
						</div>

						{/* Nivel a visualizar (techo del desglose) */}
						<div className="space-y-2">
							<Label htmlFor="idLevelView">
								Tu nivel
							</Label>
							<Select
								onValueChange={(value) => setValue('idLevelView', parseInt(value, 10))}
								value={selectedLevelViewId ? selectedLevelViewId.toString() : undefined}
							>
								<SelectTrigger className={errors.idLevelView ? 'border-destructive' : ''}>
									<SelectValue placeholder="Seleccione el nivel techo..." />
								</SelectTrigger>
								<SelectContent>
									{levels.map((lvl) => (
										<SelectItem key={lvl.idLevel} value={lvl.idLevel.toString()}>
											{lvl.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.idLevelView && (
								<p className="text-sm text-destructive">{errors.idLevelView.message}</p>
							)}
						</div>

						{/* Nivel que vendió (define la distribución) */}
						<div className="space-y-2">
							<Label htmlFor="idLevelOrigin">
								Nivel que Vendió
								<span className="ml-1 text-xs text-slate-400 font-normal">(el MS que colocó el negocio)</span>
							</Label>
							<Select
								onValueChange={(value) => setValue('idLevelOrigin', parseInt(value, 10))}
								value={selectedLevelOriginId ? selectedLevelOriginId.toString() : undefined}
							>
								<SelectTrigger className={errors.idLevelOrigin ? 'border-destructive' : ''}>
									<SelectValue placeholder="Seleccione el nivel que vendió..." />
								</SelectTrigger>
								<SelectContent>
									{sellLevels.map((lvl) => (
										<SelectItem key={lvl.idLevel} value={String(lvl.idLevel)}>
											{lvl.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.idLevelOrigin && (
								<p className="text-sm text-destructive">{errors.idLevelOrigin.message}</p>
							)}
						</div>

						{/* Mostrar Monto y Clawback sólo si hay compañía y producto seleccionados */}
						{selectedCompanyId && selectedProductId && (
							<>
								{/* Monto de la Venta */}
								<div className="space-y-2">
									<Label htmlFor="montoVenta">Monto Total de la Venta</Label>
									<div className={`flex rounded-md shadow-sm border ${errors.montoVenta ? 'border-destructive focus-within:ring-destructive focus-within:border-destructive' : 'border-input focus-within:ring-ring focus-within:border-ring'} bg-white transition-colors overflow-hidden`}>
										<Select
											value={watch('currency')}
											onValueChange={(val) => setValue('currency', val as 'USD' | 'COP')}
										>
											<SelectTrigger className="w-[85px] border-0 border-r rounded-none bg-slate-50 focus:ring-0 focus:ring-offset-0 text-slate-700 font-medium">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="USD">USD</SelectItem>
												<SelectItem value="COP">COP</SelectItem>
											</SelectContent>
										</Select>
										<Input
											id="montoVenta"
											type="number"
											step="any"
											placeholder="Ej. 10000"
											{...register('montoVenta', { valueAsNumber: true })}
											className="border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 pl-3 bg-transparent"
										/>
									</div>
									{errors.montoVenta && (
										<p className="text-sm text-destructive">
											{errors.montoVenta.message}
										</p>
									)}
								</div>

								{/* Clawback */}
								<div className="space-y-2 pt-2">
									<div className="space-y-1">
										<Label htmlFor="clawback">% Clawback</Label>
										<div className="h-10 flex items-center">
											<Badge variant="secondary" className="text-sm px-3 py-1 bg-slate-100 text-slate-700 font-medium">
												{watch('clawback')}%
											</Badge>
											<input type="hidden" {...register('clawback', { valueAsNumber: true })} />
										</div>
									</div>
								</div>
							</>
						)}
					</div>

					{selectedProductId && selectedLevelOriginId && (!distributionHasConfig || productHasZeroCommission) && (
						<Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Configuración incompleta</AlertTitle>
							<AlertDescription>
								{productHasZeroCommission && !distributionHasConfig 
									? "Este producto no tiene porcentaje de comisión ni configuración de jerarquía. Ve a configurar el producto en el administrador."
									: productHasZeroCommission
									? "Este producto tiene una comisión base de 0% o no tiene comisión configurada. Asegúrate de configurar la comisión del producto."
									: "No hay configuración de distribución en la jerarquía para el producto y nivel seleccionado."}
							</AlertDescription>
						</Alert>
					)}

					<div className="flex flex-col sm:flex-row gap-4 pt-4">
						<Button
							type="submit"
							disabled={isPending || !distributionHasConfig || productHasZeroCommission}
							className="flex-1 bg-[#0D5B69] hover:bg-[#09424c]"
						>
							{isPending ? 'Calculando...' : 'Calcular'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={handleClear}
							disabled={isPending}
							className="flex-1"
						>
							Limpiar
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
