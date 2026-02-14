'use client'

import React from 'react'
import { Controller } from 'react-hook-form'
import { Button } from '@/features/shared/ui/button'
import { Label } from '@/features/shared/ui/label'
import { Input } from '@/features/shared/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import type { CreateProductConfigurationFormData } from '../lib/product-configuration-schemas'
import type { ProductConfiguration } from '../types/product-configuration.types'
import { useProductConfigurationForm } from '../hooks/use-product-configuration-form'
import { cn } from '@/lib/utils'

interface ProductConfigurationFormProps {
	mode: 'create' | 'edit'
	initialData?: ProductConfiguration
	onSubmit: (data: Record<string, unknown>) => Promise<void>
	onCancel?: () => void
	isLoading?: boolean
}

export function ProductConfigurationForm({
	mode,
	initialData,
	onSubmit,
	onCancel,
	isLoading = false,
}: ProductConfigurationFormProps) {
	const {
		form,
		companiesState,
		productsState,
		clientOriginsState,
		categoriesState,
		ppcOptions,
		selectedPpc,
		setSelectedPpc,
	} = useProductConfigurationForm({ mode, initialData })

	const {
		handleSubmit,
		formState: { errors, isSubmitting },
		control,
		watch,
	} = form

	const watchedProduct = watch('idProduct')
	const selectedCompanyId = watch('idCompany')

	const handleFormSubmit = async (data: CreateProductConfigurationFormData) => {
		if (mode === 'edit') {
			await onSubmit({
				idProductPercentageCommissionNewBusinesses: parseInt(selectedPpc),
			})
		} else {
			await onSubmit(data)
		}
	}

	const isFormDisabled = isLoading || isSubmitting

	// Edit Mode View
	if (mode === 'edit' && initialData) {
		return (
			<form
				onSubmit={(e) => {
					e.preventDefault()
					handleFormSubmit({
						idCompany: initialData.product.company.idCompany,
						idProduct: initialData.idProduct,
						idClientOrigin: initialData.idClientOrigin,
						idCategory: initialData.idCategory,
					})
				}}
				className="space-y-6"
			>
				<Card>
					<CardHeader>
						<CardTitle>Información de la Configuración</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Empresa</Label>
								<Input value={initialData.product.company.name} disabled />
							</div>
							<div className="space-y-2">
								<Label>Producto</Label>
								<Input value={initialData.product.name} disabled />
							</div>
							<div className="space-y-2">
								<Label>Origen de Cliente</Label>
								<Input value={initialData.clientOrigin.name} disabled />
							</div>
							<div className="space-y-2">
								<Label>Categoría</Label>
								<Input value={initialData.category.name} disabled />
							</div>
						</div>
						<div className="space-y-2">
							<Label>Código</Label>
							<Input value={initialData.code} disabled />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Comisión de Porcentaje (Nuevos Negocios)</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label>
								Referencia PPC <span className="text-destructive">*</span>
							</Label>
							<Select
								value={selectedPpc}
								onValueChange={setSelectedPpc}
								disabled={isFormDisabled}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione una comisión" />
								</SelectTrigger>
								<SelectContent>
									{ppcOptions.map((ppc) => (
										<SelectItem
											key={ppc.idProductPercentageCommission}
											value={ppc.idProductPercentageCommission.toString()}
										>
											PPC #{ppc.idProductPercentageCommission}{' '}
											{ppc.active ? '(Activo)' : '(Inactivo)'}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				<div className="flex justify-end gap-3 pt-4">
					{onCancel && (
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							disabled={isFormDisabled}
						>
							Cancelar
						</Button>
					)}
					<Button type="submit" disabled={isFormDisabled || !selectedPpc}>
						{isLoading || isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
					</Button>
				</div>
			</form>
		)
	}

	// Create Mode View
	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Datos de la Configuración</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Company Select */}
					<div className="space-y-2">
						<Label>
							Compañía <span className="text-destructive">*</span>
						</Label>
						<Controller
							name="idCompany"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value ? field.value.toString() : ''}
									onValueChange={(val) => field.onChange(parseInt(val))}
									disabled={
										isFormDisabled || companiesState.status === 'loading'
									}
								>
									<SelectTrigger
										className={cn(
											companiesState.status === 'error' && 'border-destructive'
										)}
									>
										<SelectValue
											placeholder={
												companiesState.status === 'loading'
													? 'Cargando...'
													: companiesState.status === 'error'
														? 'Error al cargar'
														: 'Seleccione una compañía'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{companiesState.data?.map((company) => (
											<SelectItem
												key={company.idCompany}
												value={company.idCompany.toString()}
											>
												{company.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{companiesState.status === 'error' && (
							<p className="text-sm text-destructive">{companiesState.error}</p>
						)}
					</div>

					{/* Product Select */}
					<div className="space-y-2">
						<Label>
							Producto <span className="text-destructive">*</span>
						</Label>
						<Controller
							name="idProduct"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value ? field.value.toString() : ''}
									onValueChange={(val) => field.onChange(parseInt(val))}
									disabled={
										isFormDisabled ||
										!selectedCompanyId ||
										productsState.status === 'loading'
									}
								>
									<SelectTrigger
										className={cn(errors.idProduct && 'border-destructive')}
									>
										<SelectValue
											placeholder={
												productsState.status === 'loading'
													? 'Cargando...'
													: !selectedCompanyId
														? 'Seleccione primero una compañía'
														: 'Seleccione un producto'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{productsState.data?.map((product) => (
											<SelectItem
												key={product.idProduct}
												value={product.idProduct.toString()}
											>
												{product.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{productsState.status === 'error' && (
							<p className="text-sm text-destructive">{productsState.error}</p>
						)}
						{errors.idProduct && (
							<p className="text-sm text-destructive">
								{errors.idProduct.message}
							</p>
						)}
					</div>

					{/* ClientOrigin Select */}
					<div className="space-y-2">
						<Label>
							Origen de Cliente <span className="text-destructive">*</span>
						</Label>
						<Controller
							name="idClientOrigin"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value ? field.value.toString() : ''}
									onValueChange={(val) => field.onChange(parseInt(val))}
									disabled={
										isFormDisabled || clientOriginsState.status === 'loading'
									}
								>
									<SelectTrigger
										className={cn(
											errors.idClientOrigin && 'border-destructive'
										)}
									>
										<SelectValue
											placeholder={
												clientOriginsState.status === 'loading'
													? 'Cargando...'
													: 'Seleccione un origen de cliente'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{clientOriginsState.data?.map((origin) => (
											<SelectItem
												key={origin.idClientOrigin}
												value={origin.idClientOrigin.toString()}
											>
												{origin.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{clientOriginsState.status === 'error' && (
							<p className="text-sm text-destructive">
								{clientOriginsState.error}
							</p>
						)}
						{errors.idClientOrigin && (
							<p className="text-sm text-destructive">
								{errors.idClientOrigin.message}
							</p>
						)}
					</div>

					{/* Category Select */}
					<div className="space-y-2">
						<Label>
							Categoría <span className="text-destructive">*</span>
						</Label>
						<Controller
							name="idCategory"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value ? field.value.toString() : ''}
									onValueChange={(val) => field.onChange(parseInt(val))}
									disabled={
										isFormDisabled || categoriesState.status === 'loading'
									}
								>
									<SelectTrigger
										className={cn(errors.idCategory && 'border-destructive')}
									>
										<SelectValue
											placeholder={
												categoriesState.status === 'loading'
													? 'Cargando...'
													: 'Seleccione una categoría'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{categoriesState.data?.map((cat) => (
											<SelectItem
												key={cat.idCategory}
												value={cat.idCategory.toString()}
											>
												{cat.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{categoriesState.status === 'error' && (
							<p className="text-sm text-destructive">
								{categoriesState.error}
							</p>
						)}
						{errors.idCategory && (
							<p className="text-sm text-destructive">
								{errors.idCategory.message}
							</p>
						)}
					</div>
				</CardContent>
			</Card>

			<div className="flex justify-end gap-3 pt-4">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isFormDisabled}
					>
						Cancelar
					</Button>
				)}
				<Button type="submit" disabled={isFormDisabled || !watchedProduct}>
					{isLoading || isSubmitting ? 'Creando...' : 'Crear Configuración'}
				</Button>
			</div>
		</form>
	)
}
