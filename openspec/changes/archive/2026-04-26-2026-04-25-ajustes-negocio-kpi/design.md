# Design: Refactorización de KPIs de Negocio del Coach

## Technical Approach

Refactorización del dashboard de negocios para el rol Coach (AGENTE): KPIs Data-Dense con identidad visual alineada al badge de estado, filtro de fechas por `createdAt` exclusivo del Coach, ocultamiento de acciones no autorizadas, y corrección de timezone en el Excel export.

## Architecture Decisions

| Decisión | Elección | Alternativa rechazada | Rationale |
|----------|----------|-----------------------|-----------|
| Componente KPI visual | `CoachKpiCard` con `colorScheme` (orange/emerald/indigo) | `iconColor` string libre | Alineación semántica con `BusinessStatusBadge`; token fijo evita clases Tailwind dinámicas |
| Campo de fecha del Coach | `createdAt` (createdFrom/createdTo) | Mantener `dateAnchored` | Coach necesita ver negocios creados en el período, no fondeados |
| Separación de params de fecha | `createdFrom`/`createdTo` (createdAt) vs `dateFrom`/`dateTo` (dateAnchored) | Un único param con discriminador | Retrocompatibilidad — admin sigue usando `dateFrom`/`dateTo` para fondeo |
| Fechas Coach: obligatorias | Inicializar `useState` con mes actual, handlers impiden vaciar | Validación en submit | UX: el Coach siempre ve datos del período; nunca una tabla vacía por falta de fechas |
| Ruta `/dashboard/agente` | Redirect a `/dashboard/negocios` + eliminar del menú | Mantener con feature flag | Versión actual no tiene contenido diferenciado; KPIs están en negocios |
| Bloqueo de estado (admin) | `isFundDateRangeActive` desactiva el Select + auto-setea FONDEADO | Filtro independiente | `dateAnchored` solo existe en negocios FONDEADO; bloquear evita confusión |
| Fix timezone Excel | `parseBogotaInclusiveUtcRange` para `dateFromObj`/`dateToObj` | `new Date("YYYY-MM-DD")` | `new Date(isoDay)` interpreta UTC midnight → en Bogotá es el día anterior |

## Data Flow

### Coach — fecha de creación

    NegociosPageClient
      searchParams.dateFrom / dateTo (inicializados: 1ro mes → hoy)
         │
         ├─── useBusinessStats({ dateFrom, dateTo })
         │         │
         │         └── GET /api/negocios/stats?dateFrom=&dateTo=
         │                  └── calculateAggregateForStatus × 3
         │                       WHERE createdAt BETWEEN gte AND lte (Bogotá UTC)
         │
         └─── listParams = { createdFrom: dateFrom, createdTo: dateTo }
                   │
                   └── useBusinesses(listParams)
                            └── GET /api/negocios?createdFrom=&createdTo=
                                     └── buildBusinessListWhere → createdAt range

### Admin — fecha de fondeo

    NegociosPageClient
      searchParams.dateFrom / dateTo (vacíos por defecto)
         │
         ├─── isFundDateRangeActive = true cuando ambas fechas presentes
         │         └── auto-setea status=FONDEADO, bloquea Select
         │
         └─── useBusinesses(searchParams)
                   └── GET /api/negocios?dateFrom=&dateTo=
                            └── buildBusinessListWhere → dateAnchored range

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/components/CoachKpiCard.tsx` | Modify | Reemplaza `iconColor` por `colorScheme: 'orange'|'emerald'|'indigo'`; aplica border-l, header bg y título con el color del badge correspondiente |
| `src/features/negocios/components/StatsOverview.tsx` | Modify | Pasa `colorScheme` en lugar de `iconColor` a cada `CoachKpiCard` |
| `src/app/dashboard/agente/page.tsx` | Modify | Reemplazado por redirect a `/dashboard/negocios` |
| `src/lib/navigation/menu-items.tsx` | Modify | Elimina item "Mi Dashboard" de `AGENTE_MENU_ITEMS` |
| `src/app/api/negocios/stats/route.ts` | Modify | `dateAnchoredFilter` → `createdAtFilter`; aplica a los 3 KPIs (no solo fondeados) |
| `src/features/negocios/types/business-api.types.ts` | Modify | Añade `createdFrom?`/`createdTo?` a `BusinessListParams` |
| `src/features/negocios/lib/business-api.schemas.ts` | Modify | Añade `createdFrom`/`createdTo` al schema con la misma validación ISO y superRefine de par obligatorio |
| `src/features/negocios/lib/build-business-list-where.ts` | Modify | Añade `createdAtRange` a `BusinessListFilterInput`; pushea `{ createdAt: { gte, lte } }` |
| `src/features/negocios/lib/to-business-list-filter-input.ts` | Modify | Acepta `createdFrom`/`createdTo`; parsea a `createdAtRange` via `parseBogotaInclusiveUtcRange` |
| `src/app/api/negocios/route.ts` | Modify | Parsea y pasa `createdFrom`/`createdTo` a `toBusinessListFilterInput` |
| `src/features/negocios/hooks/use-businesses.ts` | Modify | Añade `hasFullCreatedDateRange`; pasa `createdFrom`/`createdTo` al service |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modify | Inicializa fechas Coach; mapea a `createdFrom/createdTo` para lista; `isFundDateRangeActive` para admin |
| `src/features/negocios/components/MisNegociosPage.tsx` | Modify | Propaga `fundDateRangeActive` |
| `src/features/negocios/components/BusinessTableSection.tsx` | Modify | Label "Creación" para Coach vs "Fondeo" para admin; bloquea Select cuando `fundDateRangeActive`; oculta cancelar para AGENTE |
| `src/app/api/negocios/export/route.ts` | Modify | Usa `parseBogotaInclusiveUtcRange` para construir `dateFromObj`/`dateToObj` (fix timezone -1 día) |

## Interfaces / Contracts

```typescript
// Sin cambios en la respuesta de stats
interface CoachKpiResponse {
  ventasEfectuadas: KpiCardData
  emitidos: KpiCardData
  fondeados: KpiCardData
}

// Nuevos params en BusinessListParams
interface BusinessListParams {
  dateFrom?: string    // YYYY-MM-DD → filtra dateAnchored (admin)
  dateTo?: string
  createdFrom?: string // YYYY-MM-DD → filtra createdAt (coach)
  createdTo?: string
}

// colorScheme en CoachKpiCard
type KpiColorScheme = 'orange' | 'emerald' | 'indigo'
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `route.test.ts` stats | `createdAt` filter aplica a los 3 KPIs; `dateAnchored` ya no se usa |
| Unit | `build-business-list-where.test.ts` | `createdAtRange` genera cláusula `createdAt` correcta |
| Unit | `map-business-to-export-row.test.ts` | `fmtDate` con fechas Bogotá-aware muestra el día correcto |
| Integration | `negocios-page-client` | Coach inicializa con fechas, admin sin fechas |

## Migration / Rollout

No migration required. Cambios en capa de presentación y query; la estructura DB no se altera.

## Open Questions

- Ninguna.
