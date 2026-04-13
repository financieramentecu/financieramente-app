# Proposal: RF-06 distribution by code (M17, RF-07, RF-10)

## Intent

Ship **RF-06** + **M17**: entry **Config. distribución de comisiones** → select **`ProductConfiguration.code`** → rules for that configuration only (empty state first). Enforce **RF-07** (NOT NULL + unique `code`). **RF-10**: rule row actions **without ⋮**. From **Configuración Producto**, the primary action **Distribución de Comisión** navigates to the **code** route (`/dashboard/config-distribucion-comisiones/[code]/reglas`), not the legacy id URL. Legacy `/dashboard/distribucion-comisiones/[id]/...` routes remain in the codebase for backward compatibility of direct links; they are no longer linked from the product configurations table.

## Scope

### In Scope

- Menu + `/dashboard/config-distribucion-comisiones` + `[code]/reglas` (+ crear/editar), MAPA-aligned.
- Migration: `code` NOT NULL + `@unique`; backfill/runbook for null/duplicates.
- Service `getByCode` + `GET` by exact code → `{ id, code, … }`; then reuse existing `distribution-commission` APIs by `id`.
- `commission-rules-table`: visible edit + assign actions; product-approved copy.
- Share hooks/components between legacy and new routes to limit drift.
- Rules page (code flow): **Buscar nueva distribución** returns to the entry search.

### Out of Scope

- **RF-09**, **RF-11**; deprecating legacy URLs; settlement motor (MAPA §F).

## Approach

Migrate data → Prisma unique → `getByCode` → thin API → RSC/layout resolve `code`→`id` → client combobox + navigation → forms/table take `basePath` or code for links → RF-10 UI swap.

## Affected Areas

| Area | Impact |
|------|--------|
| `prisma/schema.prisma` | `code` NOT NULL + unique |
| `menu-items.tsx` | New subitem |
| `app/dashboard/config-distribucion-comisiones/**` | New |
| `api/product-configurations/**` | By-code GET |
| `features/product-configuration/services/**` | `getByCode` |
| `features/distribution-commission/**` | Paths + table |
| `openspec/specs/commission-distribution-ui/spec.md` | Delta |

## Risks

| Risk | L | Mitigation |
|------|---|------------|
| Dirty legacy `code` | M | Staging migration + backfill |
| `[code]` URL encoding | L | Encode + tests |
| Twin UIs diverge | M | Shared shells/hooks |

## Rollback Plan

Down migration if pre-prod only; else forward-fix. Remove menu + routes; revert deploy. Orphan API harmless if unused.

## Dependencies

Product copy for RF-10; staging DB dry-run.

## Success Criteria

- [x] New menu + code-first flow; product table CTA uses code route; legacy id routes optional for old bookmarks.
- [x] Empty state → select code → rules scoped to configuration; deep link works or clear error.
- [x] DB unique NOT NULL `code`; GET by code single result.
- [x] RF-10: no ⋮ for primary actions.
- [x] Migration runbook covers shadow DB (P3006), failed migration (P3009), and PostgreSQL `UPDATE … FROM` constraints.
