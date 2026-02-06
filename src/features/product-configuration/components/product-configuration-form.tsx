'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
	createProductConfigurationSchema,
	type CreateProductConfigurationFormData,
} from '../lib/product-configuration-schemas'
import type { ProductConfiguration } from '../types/product-configuration.types'
import { cn } from '@/lib/utils'

interface Company {
	idCompany: number
	name: string
}

interface Product {
	idProduct: number
	name: string
	idCompany: number
}

interface ClientOrigin {
	idClientOrigin: number
	name: string
}

interface Category {
	idCategory: number
	name: string
}

interface PpcOption {
	idProductPercentajeCommision: number
	active: boolean
}

interface ProductConfigurationFormProps {
	mode: 'create' | 'edit'
	initialData?: ProductConfiguration
	ppcOptions?: PpcOption[]
	onSubmit: (data: Record<string, unknown>) => Promise<void>
	onCancel?: () => void
	isLoading?: boolean
}

export function ProductConfigurationForm({
	mode,
	initialData,
	ppcOptions = [],
	onSubmit,
	onCancel,
	isLoading = false,
}: ProductConfigurationFormProps) {
	const [companies, setCompanies] = useState<Company[]>([])
	const [products, setProducts] = useState<Product[]>([])
	const [clientOrigins, setClientOrigins] = useState<ClientOrigin[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [selectedCompany, setSelectedCompany] = useState<string>('')
	const [loadingCompanies, setLoadingCompanies] = useState(false)
	const [loadingProducts, setLoadingProducts] = useState(false)
	const [loadingOrigins, setLoadingOrigins] = useState(false)
	const [loadingCategories, setLoadingCategories] = useState(false)

	const {
		handleSubmit,
		formState: { errors, isSubmitting },
		control,
		setValue,
		watch,
	} = useForm<CreateProductConfigurationFormData>({
		resolver:
			mode === 'create'
				? zodResolver(createProductConfigurationSchema)
				: undefined,
		defaultValues: {
			idProduct: initialData?.idProduct ?? 0,
			idClientOrigin: initialData?.idClientOrigin ?? 0,
			idCategory: initialData?.idCategory ?? 0,
		},
	})

	const [selectedPpc, setSelectedPpc] = useState<string>(
		initialData?.idProductPercentajeCommisionNewBusinesses?.toString() ??
			''
	)

	const watchedProduct = watch('idProduct')

	// Fetch companies
	const fetchCompanies = useCallback(async () => {
		setLoadingCompanies(true)
		try {
			const response = await fetch('/api/companies?status=active', {
				credentials: 'include',
			})
			const result = await response.json()
			if (result.data?.companies) {
				setCompanies(result.data.companies)
			}
		} catch (error) {
			console.error('Error fetching companies:', error)
		} finally {
			setLoadingCompanies(false)
		}
	}, [])

	// Fetch products filtered by company
	const fetchProducts = useCallback(async (companyId: string) => {
		if (!companyId) {
			setProducts([])
			return
		}
		setLoadingProducts(true)
		try {
			const response = await fetch(
				`/api/products?idCompany=${companyId}&status=active`,
				{ credentials: 'include' }
			)
			const result = await response.json()
			if (result.data?.products) {
				setProducts(result.data.products)
			}
		} catch (error) {
			console.error('Error fetching products:', error)
		} finally {
			setLoadingProducts(false)
		}
	}, [])

	// Fetch client origins
	const fetchClientOrigins = useCallback(async () => {
		setLoadingOrigins(true)
		try {
			const response = await fetch(
				'/api/client-origins?status=active',
				{ credentials: 'include' }
			)
			const result = await response.json()
			if (result.data?.clientOrigins) {
				setClientOrigins(result.data.clientOrigins)
			}
		} catch (error) {
			console.error('Error fetching client origins:', error)
		} finally {
			setLoadingOrigins(false)
		}
	}, [])

	// Fetch categories
	const fetchCategories = useCallback(async () => {
		setLoadingCategories(true)
		try {
			const response = await fetch(
				'/api/categories?status=active',
				{ credentials: 'include' }
			)
			const result = await response.json()
			if (result.data?.categories) {
				setCategories(result.data.categories)
			}
		} catch (error) {
			console.error('Error fetching categories:', error)
		} finally {
			setLoadingCategories(false)
		}
	}, [])

	// Load data on mount (create mode only)
	useEffect(() => {
		if (mode === 'create') {
			fetchCompanies()
			fetchClientOrigins()
			fetchCategories()
		}
	}, [mode, fetchCompanies, fetchClientOrigins, fetchCategories])

	// Fetch products when company changes
	useEffect(() => {
		if (selectedCompany) {
			fetchProducts(selectedCompany)
			// Reset product selection when company changes
			setValue('idProduct', 0)
		}
	}, [selectedCompany, fetchProducts, setValue])

	const handleFormSubmit = async (
		data: CreateProductConfigurationFormData
	) => {
		if (mode === 'edit') {
			await onSubmit({
				idProductPercentajeCommisionNewBusinesses:
					parseInt(selectedPpc),
			})
		} else {
			await onSubmit(data)
		}
	}

	const isFormDisabled = isLoading || isSubmitting

	if (mode === 'edit' && initialData) {
		return (
			<form
				onSubmit={(e) => {
					e.preventDefault()
					handleFormSubmit({
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
								<Label>Compañía</Label>
								<Input
									value={
										initialData.product.company.name
									}
									disabled
								/>
							</div>
							<div className="space-y-2">
								<Label>Producto</Label>
								<Input
									value={initialData.product.name}
									disabled
								/>
							</div>
							<div className="space-y-2">
								<Label>Origen de Cliente</Label>
								<Input
									value={initialData.clientOrigin.name}
									disabled
								/>
							</div>
							<div className="space-y-2">
								<Label>Categoría</Label>
								<Input
									value={initialData.category.name}
									disabled
								/>
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
						<CardTitle>
							Comisión de Porcentaje (Nuevos Negocios)
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label>
								Referencia PPC{' '}
								<span className="text-destructive">*</span>
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
											key={
												ppc.idProductPercentajeCommision
											}
											value={ppc.idProductPercentajeCommision.toString()}
										>
											PPC #{ppc.idProductPercentajeCommision}{' '}
											{ppc.active
												? '(Activo)'
												: '(Inactivo)'}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				{/* Form Actions */}
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
					<Button
						type="submit"
						disabled={isFormDisabled || !selectedPpc}
					>
						{isLoading || isSubmitting
							? 'Guardando...'
							: 'Guardar Cambios'}
					</Button>
				</div>
			</form>
		)
	}

	return (
		<form
			onSubmit={handleSubmit(handleFormSubmit)}
			className="space-y-6"
		>
			<Card>
				<CardHeader>
					<CardTitle>Datos de la Configuración</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Company Select */}
					<div className="space-y-2">
						<Label>
							Compañía{' '}
							<span className="text-destructive">*</span>
						</Label>
						<Select
							value={selectedCompany}
							onValueChange={setSelectedCompany}
							disabled={isFormDisabled || loadingCompanies}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={
										loadingCompanies
											? 'Cargando...'
											: 'Seleccione una compañía'
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{companies.map((company) => (
									<SelectItem
										key={company.idCompany}
										value={company.idCompany.toString()}
									>
										{company.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Product Select */}
					<div className="space-y-2">
						<Label>
							Producto{' '}
							<span className="text-destructive">*</span>
						</Label>
						<Controller
							name="idProduct"
							control={control}
							render={({ field }) => (
								<Select
									value={
										field.value
											? field.value.toString()
											: ''
									}
									onValueChange={(val) =>
										field.onChange(parseInt(val))
									}
									disabled={
										isFormDisabled ||
										!selectedCompany ||
										loadingProducts
									}
								>
									<SelectTrigger
										className={cn(
											errors.idProduct &&
												'border-destructive'
										)}
									>
										<SelectValue
											placeholder={
												loadingProducts
													? 'Cargando...'
													: !selectedCompany
														? 'Seleccione primero una compañía'
														: 'Seleccione un producto'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{products.map((product) => (
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
						{errors.idProduct && (
							<p className="text-sm text-destructive">
								{errors.idProduct.message}
							</p>
						)}
					</div>

					{/* ClientOrigin Select */}
					<div className="space-y-2">
						<Label>
							Origen de Cliente{' '}
							<span className="text-destructive">*</span>
						</Label>
						<Controller
							name="idClientOrigin"
							control={control}
							render={({ field }) => (
								<Select
									value={
										field.value
											? field.value.toString()
											: ''
									}
									onValueChange={(val) =>
										field.onChange(parseInt(val))
									}
									disabled={
										isFormDisabled || loadingOrigins
									}
								>
									<SelectTrigger
										className={cn(
											errors.idClientOrigin &&
												'border-destructive'
										)}
									>
										<SelectValue
											placeholder={
												loadingOrigins
													? 'Cargando...'
													: 'Seleccione un origen de cliente'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{clientOrigins.map((origin) => (
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
						{errors.idClientOrigin && (
							<p className="text-sm text-destructive">
								{errors.idClientOrigin.message}
							</p>
						)}
					</div>

					{/* Category Select */}
					<div className="space-y-2">
						<Label>
							Categoría{' '}
							<span className="text-destructive">*</span>
						</Label>
						<Controller
							name="idCategory"
							control={control}
							render={({ field }) => (
								<Select
									value={
										field.value
											? field.value.toString()
											: ''
									}
									onValueChange={(val) =>
										field.onChange(parseInt(val))
									}
									disabled={
										isFormDisabled || loadingCategories
									}
								>
									<SelectTrigger
										className={cn(
											errors.idCategory &&
												'border-destructive'
										)}
									>
										<SelectValue
											placeholder={
												loadingCategories
													? 'Cargando...'
													: 'Seleccione una categoría'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{categories.map((cat) => (
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
						{errors.idCategory && (
							<p className="text-sm text-destructive">
								{errors.idCategory.message}
							</p>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Form Actions */}
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
				<Button
					type="submit"
					disabled={
						isFormDisabled || !watchedProduct
					}
				>
					{isLoading || isSubmitting
						? 'Creando...'
						: 'Crear Configuración'}
				</Button>
			</div>
		</form>
	)
}
