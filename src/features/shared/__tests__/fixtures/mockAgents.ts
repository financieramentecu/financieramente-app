export interface Agent {
	id: string
	nombre: string
	email?: string
	codigo?: string
}

export const mockAgents: Agent[] = [
	{
		id: 'agent1',
		nombre: 'Vanesa Cardona',
		email: 'vanesa.cardona@gmail.com',
		codigo: 'AG001',
	},
	{
		id: 'agent2',
		nombre: 'Carlos Mendoza',
		email: 'carlos.mendoza@gmail.com',
		codigo: 'AG002',
	},
	{
		id: 'agent3',
		nombre: 'Ana Rodríguez',
		email: 'ana.rodriguez@gmail.com',
		codigo: 'AG003',
	},
	{
		id: 'agent4',
		nombre: 'Luis Fernández',
		email: 'luis.fernandez@gmail.com',
		codigo: 'AG004',
	},
	{
		id: 'agent5',
		nombre: 'María González',
		email: 'maria.gonzalez@gmail.com',
		codigo: 'AG005',
	},
	{
		id: 'agent6',
		nombre: 'Pedro Martínez',
		email: 'pedro.martinez@gmail.com',
		codigo: 'AG006',
	},
	{
		id: 'agent7',
		nombre: 'Laura Sánchez',
		email: 'laura.sanchez@gmail.com',
		codigo: 'AG007',
	},
	{
		id: 'agent8',
		nombre: 'Diego Ramírez',
		email: 'diego.ramirez@gmail.com',
		codigo: 'AG008',
	},
]
