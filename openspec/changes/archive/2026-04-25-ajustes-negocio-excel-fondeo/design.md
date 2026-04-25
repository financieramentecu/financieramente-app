# Design: Ajustes en Creación de Negocio, Excel y Fondeo

## Technical Approach

El diseño implementa la simplificación del formulario de negocios agrupando los campos en dos únicas secciones ("Cliente" y "Negocio") en un orden específico, pasándole a `BusinessInfoSection` todas las propiedades necesarias para funcionar de manera independiente (como el catálogo de compañías y productos). Para el Excel, se actualizará el contrato de las funciones `negociosExportColumnHeaders` y `businessesToExportRows` para aceptar opcionalmente los parámetros `dateFrom` y `dateTo`, condicionando la agregación de las columnas de fecha. La lógica de la transacción de base de datos al fondear anualidades se desvinculará de la validación inicial de estado (EMITIDO) para asegurar actualizaciones constantes a `dateAnchored`.

## Architecture Decisions

### Decision: Reestructuración de Props en Componentes de Formulario

**Choice**: Eliminar `ProductInfoSection` y concentrar los datos de catálogos y validación (como `contractDisabled`) en `BusinessInfoSectionProps`.
**Alternatives considered**: Mantener `ProductInfoSection` vivo pero renderizarlo visualmente dentro del div de Negocio.
**Rationale**: Mantener el componente antiguo generaría una separación falsa y complicaría el control del DOM (ya que el orden exacto requiere intercalar campos de producto y negocio). Es más limpio unificar todo en `BusinessInfoSection`.

### Decision: Columnas Dinámicas en Excel

**Choice**: Pasar `dateFrom` y `dateTo` desde `export/route.ts` hacia `map-business-to-export-row.ts` y hacer un `unshift` o `push` condicional.
**Alternatives considered**: Hacer que el generador de Excel asuma el rango leyendo la base de datos de los elementos.
**Rationale**: Leer el payload del request (el cual ya está validado por zod) es la fuente de verdad más rápida para saber si el usuario aplicó el filtro y qué fechas solicitó. Esto permite inyectar el texto directamente en las filas y cabeceras. Las fechas de fondeo van al inicio del excel si existen.

### Decision: Transacción de Fondeo de Anualidades

**Choice**: Extraer `tx.business.update` del bloque `if (parentWasEmitido)` para que siempre se actualice `dateAnchored`.
**Alternatives considered**: Crear una nueva ruta específica para el fondeo secundario.
**Rationale**: La semántica de "fondear una anualidad" inherentemente significa que la última fecha de fondeo del negocio debe reflejar este evento. Centralizar este update en la misma ruta asegura que todos los flujos de fondeo mantengan consistencia de datos sin duplicar endpoints.

## Data Flow

```text
[UI Formulario] 
  ├── ClientInfoSection (Solo datos básicos de cliente)
  └── BusinessInfoSection (Contrato, Compañía, Producto, Periodicidad, Plazo, Moneda, Valor, Agente)

[Excel Export]
  Request (dateFrom, dateTo) ──→ /api/negocios/export 
                                       │
                                       ▼
                              negociosExportColumnHeaders(..., dateFrom, dateTo)
                              businessesToExportRows(..., dateFrom, dateTo)
                                       │
                                       ▼
                               [ Sheet buffer ]

[Fondeo Anualidades]
  Request ──→ /api/negocios/.../fondear-anualidades
                   │
                   ▼
               Prisma Tx
               ├─ update annualPayment (status = FONDEADO)
               ├─ update business (status = FONDEADO) [Si parentWasEmitido]
               └─ update business (dateAnchored = now) [Siempre]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/components/sections/client-info-section.tsx` | Modify | Remover el renderizado del campo `contract`. |
| `src/features/negocios/components/sections/product-info-section.tsx` | Delete | Componente deprecado, su funcionalidad se absorbe. |
| `src/features/negocios/components/sections/business-info-section.tsx` | Modify | Absorber inputs: `contract`, `company`, `product`, `terms`. Aplicar ordenamiento. Actualizar Interface de Props. |
| `src/features/negocios/components/create-business-form.tsx` | Modify | Actualizar propagación de propiedades hacia `BusinessInfoSection` y remover import/uso de `ProductInfoSection`. |
| `src/features/negocios/components/edit-business-form.tsx` | Modify | Aplicar el mismo cambio estructural que en create-form. |
| `src/features/negocios/lib/map-business-to-export-row.ts` | Modify | Eliminar Mes, Año, Es anualidad. Agregar Celular. Recibir y utilizar opcionalmente `dateFrom` y `dateTo` para columnas dinámicas. |
| `src/app/api/negocios/export/route.ts` | Modify | Pasar los dates al mapper. |
| `src/app/api/negocios/[id]/fondear-anualidades/route.ts` | Modify | Garantizar update a `business.dateAnchored` fuera de la condición de cambio de estado. |

## Interfaces / Contracts

```typescript
// map-business-to-export-row.ts
export function negociosExportColumnHeaders(
	maxLeaderLevels: number,
	maxAnnualCols: number,
	dateFrom?: Date | null,
	dateTo?: Date | null
): string[]

export function businessesToExportRows(
	businesses: BusinessExportPayload[],
	leaderChains: Map<number, LeaderExportLevel[]>,
	maxAnnualCols: number,
	maxLeaderLevels: number,
	dateFrom?: Date | null,
	dateTo?: Date | null
): Record<string, string | number | null>[]
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Mapper de Export `map-business-to-export-row.test.ts` | Verificar que sin `dateFrom/To` no existan las columnas, y con ellas, se agreguen correctamente al inicio del objeto/header. Verificar eliminación de Mes, Año. |
| Integration | `fondear-anualidades/route.ts` | Simular un fondeo sobre un negocio que ya es `FONDEADO`, verificar en DB que `dateAnchored` se haya actualizado. |
| Manual | Formulario UI | Validar comportamiento del `disabled` de contrato al cambiar longitud de ID del cliente. Validar orden visual. |

## Migration / Rollout

No migration required. El cambio de UI es estético/estructural para React.

## Open Questions

- None
