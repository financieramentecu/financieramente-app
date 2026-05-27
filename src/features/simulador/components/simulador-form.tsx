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

const formSchema = z.object({
	idCompany: z.number().positive('Seleccione una compañía'),
	idProduct: z.number().positive('Seleccione un producto'),
	idClientOrigin: z.number().positive('Seleccione un origen'),
	idLevelOrigin: z.number().positive('Seleccione el nivel origen'),
	montoVenta: z.number().positive('Ingrese un monto válido mayor a 0'),
	trm: z.number().min(1, 'TRM debe ser al menos 1'),
	descuento: z.number().min(0).max(100),
	clawback: z.number().min(0).max(100),
})

export type SimuladorFormData = z.infer<typeof formSchema>

interface SimuladorFormProps {
	companies: { idCompany: number; name: string }[]
	products: { idProduct: number; name: string; idCompany: number }[]
	origins: { idClientOrigin: number; name: string }[]
	levels: { idLevel: number; name: string }[]
	onSubmit: (data: SimuladorFormData) => void
	onClear: () => void
	isPending: boolean
}

export function SimuladorForm({
	companies,
	products,
	origins,
	levels,
	onSubmit,
	onClear,
	isPending,
}: SimuladorFormProps) {
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = useForm<SimuladorFormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			idCompany: undefined,
			idProduct: undefined,
			idClientOrigin: undefined,
			idLevelOrigin: undefined,
			montoVenta: undefined,
			trm: 3500, // Por la imagen de ejemplo
			descuento: 12,
			clawback: 0,
		},
	})

	const selectedCompanyId = watch('idCompany')

	const filteredProducts = useMemo(() => {
		if (!selectedCompanyId) return []
		return products.filter((p) => p.idCompany === selectedCompanyId)
	}, [products, selectedCompanyId])

	// Reset product when company changes
	useEffect(() => {
		if (selectedCompanyId) {
			setValue('idProduct', 0 as unknown as number)
		}
	}, [selectedCompanyId, setValue])

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

						{/* Nivel de Origen */}
						<div className="space-y-2">
							<Label htmlFor="idLevelOrigin">Mi Jerarquía a Simular</Label>
							<Select
								onValueChange={(value) =>
									setValue('idLevelOrigin', parseInt(value, 10))
								}
								value={
									watch('idLevelOrigin')
										? watch('idLevelOrigin').toString()
										: undefined
								}
							>
								<SelectTrigger
									className={errors.idLevelOrigin ? 'border-destructive' : ''}
								>
									<SelectValue placeholder="Seleccione el nivel" />
								</SelectTrigger>
								<SelectContent>
									{levels.map((lvl) => (
										<SelectItem key={lvl.idLevel} value={lvl.idLevel.toString()}>
											{lvl.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.idLevelOrigin && (
								<p className="text-sm text-destructive">
									{errors.idLevelOrigin.message}
								</p>
							)}
						</div>

						{/* Monto de la Venta */}
						<div className="space-y-2">
							<Label htmlFor="montoVenta">Monto Total de la Venta (USD)</Label>
							<Input
								type="number"
								step="any"
								placeholder="$ 0"
								{...register('montoVenta', { valueAsNumber: true })}
								className={errors.montoVenta ? 'border-destructive' : ''}
							/>
							{errors.montoVenta && (
								<p className="text-sm text-destructive">
									{errors.montoVenta.message}
								</p>
							)}
						</div>

						{/* Variables Adicionales (Opcional, pre-llenado) */}
						<div className="grid grid-cols-3 gap-4 pt-2">
							<div className="space-y-2">
								<Label htmlFor="trm">TRM Base</Label>
								<Input
									type="number"
									step="any"
									{...register('trm', { valueAsNumber: true })}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="descuento">% Descuento</Label>
								<Input
									type="number"
									{...register('descuento', { valueAsNumber: true })}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="clawback">% Clawback</Label>
								<Input
									type="number"
									{...register('clawback', { valueAsNumber: true })}
								/>
							</div>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-4 pt-4">
						<Button
							type="submit"
							disabled={isPending}
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
