export interface CancelBusinessData {
	businessId: string
	businessName: string
	status: string
	owner: string
	createdAt: string
}

export const mockBusinessesForCancelation: CancelBusinessData[] = [
	{
		businessId: 'BUS2024-001',
		businessName: 'Póliza Seguro Vehicular',
		status: 'Activo',
		owner: 'Juan Pérez',
		createdAt: '2024-01-15',
	},
	{
		businessId: 'BUS2024-002',
		businessName: 'Póliza Seguro de Vida',
		status: 'Pendiente',
		owner: 'María González',
		createdAt: '2024-01-20',
	},
	{
		businessId: 'BUS2024-003',
		businessName: 'Póliza Seguro Hogar',
		status: 'Activo',
		owner: 'Carlos Rodríguez',
		createdAt: '2024-02-10',
	},
	{
		businessId: 'BUS2024-004',
		businessName: 'Póliza Seguro Empresarial',
		status: 'En revisión',
		owner: 'Ana Martínez',
		createdAt: '2024-02-25',
	},
]

export const mockCancelReasons = [
	'El cliente solicitó la cancelación por motivos personales',
	'Error en el procesamiento de la póliza',
	'El cliente cambió de aseguradora',
	'No se cumplieron los requisitos de la póliza',
	'El cliente falleció',
	'Problemas de pago recurrentes',
	'Cambio en las condiciones del negocio',
	'Cancelación por parte de la empresa aseguradora',
]
