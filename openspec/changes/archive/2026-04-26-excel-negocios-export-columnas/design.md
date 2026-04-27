# Design: Excel negocios — orden y encabezados

## Technical Approach

Seguir el patrón actual: `negociosExportColumnHeaders` define el orden que `json_to_sheet` usa como `header:`; cada fila es un `Record` con **las mismas cadenas** como claves. La fuente normativa del orden y los literales es **`proposal.md` → Orden canónico de columnas**.

Implementación:

1. Reordenar y renombrar solo el bloque base (ítems del proposal sin contar prefijo de filtro ni sufijos dinámicos).
2. **Tras** `Fecha de Fondeo`: insertar columnas dinámicas para líderes nivel 2+ (`Líder ${N} nombre`, `Líder ${N} categoría`, N ≥ 2), en el mismo orden que hoy por índice N.
3. **Después** de ese bloque: columnas **Fecha Fondeo Anualidad 1** … **Fecha Fondeo Anualidad _n_** (plantilla nueva; _n_ = máximo necesario según negocios Anual/plazo, acotado como ya existe).

Exportar `NEGOCIOS_EXPORT_VALOR_COLUMN = 'Valor de Negocio'` desde `map-business-to-export-row.ts`; la ruta importa y usa `indexOf` para formato `$#,##0.00`.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Fuente de nombres | Constantes en mapper + export columna valor | Esquema por columna | Menor diff; coincide con código actual |
| Bloque común (sin prefijo fecha) | Orden proposal ítems 3–21: Agente … Fecha de Fondeo con renombres (Número de Cédula, Correo Electrónico, Teléfono, …) | — | Contrato explícito en proposal |
| Prefijo condicional | Solo con `dateFrom` + `dateTo`: Fecha inicial fondeo, Fecha final fondeo | — | Igual semántica que hoy |
| Orden fechas en bloque base | Creación → Emisión → Fondeo (antes de L2+) | Orden legacy | Proposal |
| Líderes N≥2 | Posición: después de Fecha de Fondeo, antes de anualidades; **sin** renombrar textos `Líder N …` salvo decisión futura | Intercalar antes del primer líder | Proposal § Jerarquía adicional |
| Anualidades | Cabecera **`Fecha Fondeo Anualidad ${i}`** (i = 1..n) | `Fecha fondeo anualidad ${i}` minúsculas | Proposal |

## Data Flow

```
POST /api/negocios/export
  → findMany + leaderCache + maxAnnualCols / maxLeaderLevels
  → negociosExportColumnHeaders(...)  → headers[]  // orden = proposal
  → businessesToExportRows(...)       → rows[keys === headers]
  → json_to_sheet(rows, { header: headers })
  → indexOf(NEGOCIOS_EXPORT_VALOR_COLUMN) → cell.z = '$#,##0.00'
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `map-business-to-export-row.ts` | Modify | Orden `base`; keys en `mapBusinessToExportRow`; bucle líderes **después** de Fecha de Fondeo; template anualidades; export constante valor |
| `export/route.ts` | Modify | Import `NEGOCIOS_EXPORT_VALOR_COLUMN` |
| `__tests__/map-business-to-export-row.test.ts` | Modify | Expectativas alineadas al proposal (con/sin fechas) |
| `specs/negocios/spec.md` (delta) | Create/update | Escenarios con lista canónica |

## Interfaces / Contracts

```ts
export const NEGOCIOS_EXPORT_VALOR_COLUMN = 'Valor de Negocio'
// Anualidad i: `Fecha Fondeo Anualidad ${i}`
```

La implementación MUST igualar los literales del proposal (incl. **Compañía**, **Categoría Líder**).

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Secuencia completa de `negociosExportColumnHeaders` (sin/con prefijo fecha); keys en fila | Actualizar tests; opcional `headers.join('\|')` vs golden |
| Integration | Export 200 | `route.test.ts` si indexa columna monetaria por nombre |
| E2E | Opcional smoke export | Solo si falla por timing |

## Migration / Rollout

No migration required. Comunicar cambio de encabezados a usuarios con plantillas externas.

## Open Questions

- None bloqueante: proposal y tabla anterior fijan posición L2+ y texto **Fecha Fondeo Anualidad _n_**.
