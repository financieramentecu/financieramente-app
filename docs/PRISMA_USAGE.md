# Prisma Usage Guide - Guía de Uso de Prisma

Esta guía explica cómo usar Prisma Client correctamente en el proyecto Financieramente, siguiendo las mejores prácticas de Next.js 15 y arquitectura server-side.

## ⚠️ CRÍTICO: Prisma NUNCA se usa en Client Components

### ¿Por qué NO usar Prisma en Client Components?

1. **Seguridad**: Expondría las credenciales de la base de datos al navegador
2. **Performance**: Las queries desde el navegador son ineficientes y lentas
3. **Arquitectura**: Next.js está diseñado para que las queries a DB sean server-side

### ❌ Lo que NO debes hacer

```tsx
// ❌ INCORRECTO - Client Component usando Prisma directamente
'use client'

import { prisma } from '@/lib/prisma' // ❌ ERROR

export function UserList() {
	const [users, setUsers] = useState([])

	useEffect(() => {
		// ❌ Esto NO funcionará y es inseguro
		prisma.user.findMany().then(setUsers)
	}, [])

	return <div>{/* ... */}</div>
}
```

## ✅ Arquitectura Correcta

### 1. Server Components (Recomendado)

Los Server Components pueden usar Prisma directamente con `async/await`:

```tsx
// ✅ CORRECTO - Server Component con Prisma
import { prisma } from '@/lib/prisma'

export default async function UserList() {
	// ✅ Prisma funciona directamente en Server Components
	const users = await prisma.user.findMany({
		select: {
			id: true,
			name: true,
			email: true,
			avatar: true,
		},
	})

	return (
		<div>
			<h1>Usuarios</h1>
			<ul>
				{users.map((user) => (
					<li key={user.id}>
						{user.name} - {user.email}
					</li>
				))}
			</ul>
		</div>
	)
}
```

### 2. API Routes (Para Client Components)

Cuando necesitas datos en un Client Component, crea una API Route:

#### API Route (Server-Side)

```typescript
// ✅ CORRECTO - API Route usando Prisma
// src/app/api/users/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
	try {
		const users = await prisma.user.findMany({
			select: {
				id: true,
				name: true,
				email: true,
				avatar: true,
			},
		})

		return NextResponse.json({ users })
	} catch (error) {
		console.error('Error fetching users:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch users' },
			{ status: 500 }
		)
	}
}
```

#### Client Component consumiendo la API

```tsx
// ✅ CORRECTO - Client Component consumiendo API Route
'use client'

import { useEffect, useState } from 'react'

interface User {
	id: string
	name: string
	email: string
	avatar: string | null
}

export function UserList() {
	const [users, setUsers] = useState<User[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		// ✅ Fetch a API Route, NO Prisma directamente
		fetch('/api/users')
			.then((res) => res.json())
			.then((data) => {
				setUsers(data.users)
				setLoading(false)
			})
			.catch((error) => {
				console.error('Error:', error)
				setLoading(false)
			})
	}, [])

	if (loading) return <div>Cargando...</div>

	return (
		<div>
			<h1>Usuarios</h1>
			<ul>
				{users.map((user) => (
					<li key={user.id}>
						{user.name} - {user.email}
					</li>
				))}
			</ul>
		</div>
	)
}
```

### 3. Flujo Completo: Client Component → API Route → Prisma

```
┌─────────────────┐
│ Client Component│
│  ('use client') │
└────────┬────────┘
         │ fetch('/api/users')
         ▼
┌─────────────────┐
│   API Route     │
│  (route.ts)     │
└────────┬────────┘
         │ prisma.user.findMany()
         ▼
┌─────────────────┐
│   PostgreSQL    │
│    Database     │
└─────────────────┘
```

## Ejemplos Prácticos

### Ejemplo 1: Listar Negocios (Business)

#### Server Component

```tsx
// src/app/negocios/page.tsx
import { prisma } from '@/lib/prisma'

export default async function NegociosPage() {
	const businesses = await prisma.business.findMany({
		include: {
			user: {
				select: {
					name: true,
					avatar: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	})

	return (
		<div>
			<h1>Mis Negocios</h1>
			{businesses.map((business) => (
				<div key={business.id}>
					<h2>{business.product}</h2>
					<p>Cliente: {business.user.name}</p>
					<p>Valor: ${business.value.toString()}</p>
				</div>
			))}
		</div>
	)
}
```

#### API Route para Client Component

```typescript
// src/app/api/businesses/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const status = searchParams.get('status')

		const where = status ? { status } : {}

		const businesses = await prisma.business.findMany({
			where,
			include: {
				user: {
					select: {
						name: true,
						avatar: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		return NextResponse.json({ businesses })
	} catch (error) {
		console.error('Error fetching businesses:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch businesses' },
			{ status: 500 }
		)
	}
}
```

### Ejemplo 2: Crear un Negocio

#### API Route (POST)

```typescript
// src/app/api/businesses/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createBusinessSchema = z.object({
	identification: z.string(),
	email: z.string().email(),
	termPeriod: z.string(),
	date: z.string(),
	value: z.number(),
	product: z.string(),
	status: z.enum(['Emitido', 'Venta Efectuado']),
	userId: z.string(),
})

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const data = createBusinessSchema.parse(body)

		const business = await prisma.business.create({
			data: {
				identification: data.identification,
				email: data.email,
				termPeriod: data.termPeriod,
				date: new Date(data.date),
				value: data.value,
				product: data.product,
				status: data.status,
				userId: data.userId,
			},
			include: {
				user: {
					select: {
						name: true,
						avatar: true,
					},
				},
			},
		})

		return NextResponse.json({ business }, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Invalid data', details: error.errors },
				{ status: 400 }
			)
		}

		console.error('Error creating business:', error)
		return NextResponse.json(
			{ error: 'Failed to create business' },
			{ status: 500 }
		)
	}
}
```

#### Client Component usando la API

```tsx
// src/components/businesses/CreateBusinessForm.tsx
'use client'

import { useState } from 'react'

export function CreateBusinessForm() {
	const [loading, setLoading] = useState(false)

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		setLoading(true)

		const formData = new FormData(e.currentTarget)
		const data = {
			identification: formData.get('identification') as string,
			email: formData.get('email') as string,
			termPeriod: formData.get('termPeriod') as string,
			date: formData.get('date') as string,
			value: Number(formData.get('value')),
			product: formData.get('product') as string,
			status: formData.get('status') as 'Emitido' | 'Venta Efectuado',
			userId: formData.get('userId') as string,
		}

		try {
			// ✅ Fetch a API Route, NO Prisma directamente
			const response = await fetch('/api/businesses', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			})

			if (!response.ok) {
				throw new Error('Failed to create business')
			}

			const result = await response.json()
			console.log('Business created:', result.business)
			// Redirigir o actualizar estado
		} catch (error) {
			console.error('Error:', error)
		} finally {
			setLoading(false)
		}
	}

	return (
		<form onSubmit={handleSubmit}>
			{/* Campos del formulario */}
			<button type="submit" disabled={loading}>
				{loading ? 'Creando...' : 'Crear Negocio'}
			</button>
		</form>
	)
}
```

## Configuración por Entornos

### Desarrollo (Dev)

- **Base de datos**: Supabase
- **Archivo**: `.env.local` (gitignored)
- **Connection String**: Configurado con DATABASE_URL y DIRECT_URL
- **Ver**: `docs/DATABASE_CONNECTION.md` para configuración detallada

```bash
# .env.local
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
```

### QA

- **Base de datos**: Droplet de QA (PostgreSQL en Docker)
- **Configuración**: Automática vía GitHub Actions
- **Connection String**: `postgresql://financieramente_user:PASSWORD@postgres:5432/financieramente_qa`
- **Migraciones**: Se ejecutan automáticamente en `.github/workflows/deploy-qa.yml`

### Producción

- **Base de datos**: Droplet de Prod (PostgreSQL en Docker)
- **Configuración**: Automática vía GitHub Actions
- **Connection String**: `postgresql://financieramente_user:PASSWORD@postgres:5432/financieramente_prod`
- **Migraciones**: Se ejecutan automáticamente en `.github/workflows/deploy-prod.yml`

## Uso del Cliente Prisma

### Importar el Cliente

```typescript
import { prisma } from '@/lib/prisma'
```

El cliente está configurado como singleton para evitar múltiples instancias en desarrollo (especialmente importante en Next.js serverless).

### Queries Comunes

#### Buscar Todos

```typescript
const users = await prisma.user.findMany()
```

#### Buscar con Filtros

```typescript
const businesses = await prisma.business.findMany({
	where: {
		status: 'Emitido',
		value: {
			gte: 1000,
		},
	},
})
```

#### Buscar Uno

```typescript
const user = await prisma.user.findUnique({
	where: {
		id: 'user-id',
	},
})
```

#### Crear

```typescript
const newUser = await prisma.user.create({
	data: {
		name: 'John Doe',
		email: 'john@example.com',
		role: 'admin',
	},
})
```

#### Actualizar

```typescript
const updatedUser = await prisma.user.update({
	where: {
		id: 'user-id',
	},
	data: {
		name: 'Jane Doe',
	},
})
```

#### Eliminar

```typescript
await prisma.user.delete({
	where: {
		id: 'user-id',
	},
})
```

#### Incluir Relaciones

```typescript
const business = await prisma.business.findUnique({
	where: {
		id: 'business-id',
	},
	include: {
		user: {
			select: {
				name: true,
				email: true,
				avatar: true,
			},
		},
	},
})
```

## Manejo de Errores

### En Server Components

```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function UserPage({ params }: { params: { id: string } }) {
	try {
		const user = await prisma.user.findUnique({
			where: { id: params.id },
		})

		if (!user) {
			notFound()
		}

		return <div>{user.name}</div>
	} catch (error) {
		console.error('Error fetching user:', error)
		throw new Error('Failed to fetch user')
	}
}
```

### En API Routes

```typescript
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
	try {
		const users = await prisma.user.findMany()
		return NextResponse.json({ users })
	} catch (error) {
		console.error('Database error:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
```

## Validación con Zod

Es recomendado validar los datos antes de usarlos con Prisma:

```typescript
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const createUserSchema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	role: z.string(),
})

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const data = createUserSchema.parse(body) // Valida y transforma

		const user = await prisma.user.create({
			data, // Ya validado
		})

		return NextResponse.json({ user })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Invalid data', details: error.errors },
				{ status: 400 }
			)
		}
		throw error
	}
}
```

## Patrones Recomendados

### 1. Usar Select para Optimizar Queries

```typescript
// ✅ Solo trae los campos necesarios
const users = await prisma.user.findMany({
	select: {
		id: true,
		name: true,
		email: true,
		// No incluye avatar, role, etc. si no los necesitas
	},
})
```

### 2. Paginación

```typescript
const page = 1
const pageSize = 10

const [businesses, total] = await Promise.all([
	prisma.business.findMany({
		skip: (page - 1) * pageSize,
		take: pageSize,
	}),
	prisma.business.count(),
])
```

### 3. Transacciones

```typescript
await prisma.$transaction(async (tx) => {
	const user = await tx.user.create({
		data: { name: 'John', email: 'john@example.com', role: 'admin' },
	})

	await tx.business.create({
		data: {
			product: 'Product A',
			userId: user.id,
			// ... otros campos
		},
	})
})
```

## Relación con Migraciones

Para información sobre cómo crear y aplicar migraciones, ver:

- `docs/PRISMA_MIGRATIONS.md` - Guía completa de migraciones
- `docs/DATABASE_CONNECTION.md` - Configuración de conexiones

## Recursos Adicionales

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
