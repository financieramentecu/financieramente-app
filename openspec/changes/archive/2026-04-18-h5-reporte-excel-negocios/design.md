# Design: H5 — Reporte Excel (negocios)

## Technical Approach

**POST `/api/negocios/export`** autentica con `auth()`, carga usuario con `getCurrentUserByEmail`, y responde **403** si el rol no es `ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA` o `ANALISTA_SOPORTE`. Genera un **xlsx** con `XLSX.utils.json_to_sheet` + `XLSX.write` y `NextResponse` blob.

**Una sola fuente de verdad para el `where` de Prisma:** `buildBusinessListWhere` + **`toBusinessListFilterInput`**, usado por **GET** (`businessListParamsSchema`) y **POST export** (`negociosExportBodySchema`) para que búsqueda, estado y rango de fondeo produzcan el **mismo** `BusinessListFilterInput` cuando los parámetros lógicos coinciden. Rango de fondeo: **opcional**; si faltan `dateFrom`/`dateTo` o no van juntos, no se aplica filtro `date_anchored` (misma regla que el listado). Con rango: `parseBogotaInclusiveUtcRange` + `dateAnchored` con `NOT null` (día civil `America/Bogotá` vía `@date-fns/tz`).

Export: `count` + **413** si `total > EXPORT_MAX_ROWS` (**5000**), **404** sin filas, luego `findMany` con `include: businessExportInclude`, orden `idBusiness asc`, tope 5000. Filas: `mapBusinessToExportRow` + `negociosExportColumnHeaders` (orden fijo de columnas; evita desalineación en SheetJS). Líderes y anualidades: `resolveLeaderChainForExport` con caché; columnas anualidad acotadas en el mapper.

**UI:** `DataTable` con toolbar (búsqueda, fondeo, estado, export y vista); cliente `exportReport` en `business.service`.

## Architecture Decisions

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| POST body vs GET largo | Caché / URL | **POST** JSON |
| Servidor vs cliente Excel | Seguridad y volumen | **Servidor** |
| `@date-fns/tz` vs UTC manual | DST | **`@date-fns/tz`** Bogotá |
| Helper líderes en negocios vs import pre-liquidación | Acoplamiento | **`resolve-leader-chain-export`** en feature |
| Fechas export obligatorias vs opcionales | UX lista = export sin rango | **Opcionales** (par obligatorio si se envía uno) |
| Columnas JSON sin orden vs `header` explícito | Cabeceras vs valores | **`negociosExportColumnHeaders`** en `json_to_sheet` |

## Data Flow

```
UI → POST /api/negocios/export (cookie)
  → auth → usuario → rol export
  → Zod body → toBusinessListFilterInput → buildBusinessListWhere
  → count → 404 / 413 / findMany(include export)
  → leaders cache → map rows → json_to_sheet({ header }) → blob 200
```

GET lista: mismos filtros vía `toBusinessListFilterInput` desde query validado.

## File Changes (implementado)

| File | Role |
|------|------|
| `build-business-list-where.ts`, `bogota-date-range.ts`, `to-business-list-filter-input.ts` | Filtros compartidos |
| `business-export-include.ts`, `map-business-to-export-row.ts`, `resolve-leader-chain-export.ts`, `export-limits.ts` | Datos Excel |
| `business-api.schemas.ts` | Lista + `negociosExportBodySchema` |
| `app/api/negocios/route.ts`, `app/api/negocios/export/route.ts` | API |
| `business.service.ts`, `use-business-export.ts` | Cliente |
| `negocios-page-client.tsx`, `MisNegociosPage`, `BusinessTableSection`, `DataTable*` | UI |
| `__tests__/…` bogota, build-where, map-export, export route 403, `list-export-filter-parity` | Tests |

## Interfaces / Contracts

```ts
// POST /api/negocios/export — body (tipos en business-api.types)
interface NegociosExportBody {
  dateFrom?: string // YYYY-MM-DD; con dateTo activa filtro date_anchored
  dateTo?: string
  status?: BusinessStatus
  search?: string
}
```

Respuestas: **200** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`; **413** si matches > `EXPORT_MAX_ROWS`; **403** rol; **400** Zod; **404** cero filas.

## Testing Strategy

| Layer | Qué | Cómo |
|-------|-----|------|
| Unit | Bogotá, `buildBusinessListWhere`, map filas Excel | Vitest |
| Paridad lista/export | Mismo `where` para query ≡ body | `list-export-filter-parity.test.ts` |
| Integration | Export: 403, 200, 413, 404, ANALISTA | `export/__tests__/route.test.ts` |

**Cobertura reciente:** integración export (200 blob, 413, **404 sin filas**, ANALISTA 200); E2E ADMIN / **ANALISTA** / AGENTE en `e2e/negocios-export.spec.ts`.

## Migration / Rollout

Sin migración de datos para H5.

## PII / §4.5 — Inventario de columnas (export actual)

Fuente de verdad en código: `negociosExportColumnHeaders` + `mapBusinessToExportRow` (`map-business-to-export-row.ts`). El PRD exige **lista mínima legal** aún **TBD**; este inventario sirve para **revisión legal/producto** antes de recortar columnas.

| Cabecera Excel | ¿Contiene PII o datos personales? | Rol típico en comisiones |
|----------------|-----------------------------------|---------------------------|
| ID negocio | No (identificador interno) | Correlación |
| Contrato | Puede contener datos contractuales | Referencia negocio |
| Estado | No | Reglas de liquidación |
| Fecha creación / emisión / fondeo (negocio) | No | Plazos y ciclo |
| Cliente | **Sí** (nombre agregado) | Identificación del caso |
| Documento cliente | **Sí** | Identificación fuerte |
| Email cliente | **Sí** | Contacto; **candidato frecuente a redundancia** si ya hay doc + nombre |
| Compañía / Producto / Origen | No / metadatos | Cálculo y trazabilidad |
| Valor / Moneda / Plazo / Periodicidad / Anualidades | No | Montos y reglas |
| Coach / Categoría coach | **Sí** (nombre coach) | Jerarquía de comisiones |
| Líder *n* nombre / categoría | **Sí** (nombre líder) | §4.4 cadena ascendente |
| Fecha fondeo anualidad *i* | No (fecha) | Pagos parciales |

**Decisión pendiente (fuera de código):** qué columnas retirar u ofuscar tras sign-off legal. **No** cambiar el mapper hasta esa decisión explícita.

## Open Questions

- [ ] **Sign-off** legal/producto sobre recortes u ofuscación de columnas (inventario arriba; PRD §4.5 TBD).
