# Design: RF-06 config distribución by code

## Technical Approach

Add **parallel** App Router pages under `config-distribucion-comisiones/` that mirror legacy `distribucion-comisiones/[id]/...` but bind `params.code` → **`id`** via a **feature service** + **GET API**. All **commission** reads/writes keep using existing `/api/product-configurations/[id]/distribution-commission/**` after `id` is known. Extend **`CommissionRulesTable`** and **`CommissionRuleForm`** with **`distributionBasePath`** = `/dashboard/.../<id-or-code>` **sin** `/reglas` (igual patrón que hoy con `productConfigId`), para concatenar `/reglas`, `/reglas/crear`, etc. **RF-10:** replace row `DropdownMenu` with **Button + Link** column.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Resolve `code` | `GET /api/product-configurations/by-code/[code]` → `{ data: { id, code, … } }` | Query `?code=` only; client-side list filter | Stable deep links, 404 for unknown, one round-trip; handler delegates to service |
| Prisma access | New `getProductConfigurationByCode` in `src/features/product-configuration/services/product-configuration.service.ts` | Prisma in route handler | Matches AGENTS: routes delegate to services |
| Page param | Dynamic segment `[code]`; `decodeURIComponent` in page | Query-only URL | MAPA deep link; matches proposal |
| Shared UI | Extract thin **`CommissionRulesPageContent`** (optional) or pass props only | Duplicate pages | Minimize drift; legacy id pages remain for bookmarks; table CTA uses code flow |
| Migration | SQL backfill nulls + dedupe script before `NOT NULL` + `UNIQUE` | App-level only | RF-07 requires DB truth |

## Data Flow

```
Menu → /config-distribucion-comisiones (client)
  → combobox: GET /api/product-configurations?search=… OR lightweight codes endpoint
  → user picks code → push /config-distribucion-comisiones/[code]/reglas

[code]/reglas/page (client)
  → GET /api/product-configurations/by-code/[code] → id
  → useCommissionRules(id) → existing distribution-commission API
  → CommissionRulesTable(..., distributionBasePath=`/dashboard/config-distribucion-comisiones/${encodeURIComponent(code)}`)

Forms → commissionRuleApi (unchanged URLs with id) → router.push(`${distributionBasePath}/reglas`)

**Configuración Producto list:** single **Distribución de Comisión** button → `/dashboard/config-distribucion-comisiones/${encodeURIComponent(code)}/reglas` (fallback: entry page if `code` missing).

**Rules header (code flow):** outline button **Buscar nueva distribución** → `/dashboard/config-distribucion-comisiones` (search again).
```

## File Changes

| File | Action |
|------|--------|
| `prisma/schema.prisma` | `code` non-null + `@unique` |
| `prisma/migrations/*` | Backfill + alter |
| `product-configuration/services/product-configuration.service.ts` | **Create** `getByCode` |
| `app/api/product-configurations/by-code/[code]/route.ts` | **Create** GET, auth, `ApiResponse` |
| `product-configuration/lib/product-configuration-api.ts` | Add `getByCode` client helper |
| `lib/navigation/menu-items.tsx` | Subitem **Config. distribución de comisiones** |
| `app/dashboard/config-distribucion-comisiones/page.tsx` | **Create** entry + empty state + selector |
| `app/dashboard/config-distribucion-comisiones/[code]/reglas/**` | **Create** mirror crear/editar |
| `distribution-commission/components/commission-rules-table.tsx` | `distributionBasePath`; RF-10 actions |
| `distribution-commission/components/commission-rule-form.tsx` | Prop `distributionBasePath` (default legacy URL) |
| `product-configurations-table.tsx` | Single **Distribución de Comisión** → code route; no second button, no id-based link from table |
| `[code]/reglas/page.tsx` | Header **Buscar nueva distribución** → entry |
| `RUNBOOK-code-migration.md` | P3006 (shadow), P3009 (failed migration), PostgreSQL `UPDATE … FROM` / `42P01` |
| `20260412190000_…/migration.sql` | Quoted `public.*` identifiers; comma-`FROM` + `WHERE` joins (not `JOIN … ON pc`); `LEFT(code,50)` |

## Interfaces / Contracts

- **`GET /api/product-configurations/by-code/[code]`** — 200 `{ data: ProductConfiguration }` minimal fields for header + `id`; 404 `{ data: null, error }`. `code` URL-encoded.
- **`distributionBasePath`**: `string` — base URL **without** `/reglas` (e.g. `/dashboard/config-distribucion-comisiones/MY-CODE`); append `/reglas`, `/reglas/crear`, `/reglas/editar/:id` like today’s `distribucion-comisiones/${id}` pattern.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `getByCode` | Vitest + mocked Prisma |
| Integration | by-code route | Supertest-style or route test like existing `route.test.ts` |
| Component | Table links + RF-10 | RTL: visible buttons, hrefs |
| E2E (opt) | Select code → rules | Playwright smoke |

## Migration / Rollout

1. Staging: list null/duplicate `code`.  
2. Backfill (`buildProductConfigurationCode` or manual).  
3. Apply `UNIQUE` + `NOT NULL` via `migrate deploy` (see RUNBOOK if P3009 after a failed attempt: `migrate resolve --rolled-back` then redeploy).  
4. Deploy API + UI. Prefer **`DIRECT_URL`** (non-pooled) for Neon when running migrations.  
5. If `migrate dev` fails on shadow (P3006/P1014), use `migrate deploy` or configure `shadowDatabaseUrl`.

## Open Questions

- [ ] Final **RF-10** Spanish label (PRD vs current string).
- [ ] Combobox data source: reuse paginated `GET` list with **exact** code filter vs dedicated **codes-only** endpoint for performance.
