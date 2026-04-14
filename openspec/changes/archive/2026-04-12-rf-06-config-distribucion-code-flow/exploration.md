# Exploration: RF-06 and bundleable requirements (M17, RF-07, RF-08, RF-09, RF-10)

## Exploration: RF-06 and bundleable RFs

### Current State

- **Legacy distribution UX:** `DistributionCommissionPageClient` still lists product configurations; **`product-configurations-table.tsx`** primary action **Distribución de Comisión** targets the **code** route `/dashboard/config-distribucion-comisiones/${encodeURIComponent(code)}/reglas` (fallback: entry search). Legacy **`/dashboard/distribucion-comisiones/[id]/...`** remains for direct URLs, not linked from that table.
- **APIs:** All distribution commission routes are keyed by **`[id]`** of `ProductConfiguration` (e.g. `GET/POST /api/product-configurations/[id]/distribution-commission`). Listing supports `search` across `code`, product, origin, and category names (`route.ts` GET).
- **`code` field:** Generated on `POST` create (`buildProductConfigurationCode`). Prisma model still has `code String?` with **no** `@unique` on `code` — only `@@unique([idProduct, idClientOrigin, idCategory])`. **RF-07 (NOT NULL + unique + findUnique by code) is not fully enforced in schema.**
- **Menu:** Under Administración there is **Config. Producto** but **no** item **Config. distribución de comisiones** (`menu-items.tsx`) — **M17** not implemented in code.
- **RF-10 gap:** `commission-rules-table.tsx` uses a **⋮** `DropdownMenu` for Edit and “Asignar a Nuevos Negocios”; PRD asks for **visible row actions** without ⋮ for primary actions.
- **RF-08:** `description` is optional on PPC in schema; forms/API already support optional description in the distribution feature (aligned with RF-08 — verify copy only).
- **RF-09:** Requires removing a “nuevos negocios” column from **product configuration** list module — separate surface from distribution pages.

### Affected Areas

- `src/lib/navigation/menu-items.tsx` — add **Config. distribución de comisiones**; role visibility if needed.
- `src/app/dashboard/config-distribucion-comisiones/**` (new) — entry, empty state, `[code]/reglas`, crear/editar per MAPA M17 proposal.
- `prisma/schema.prisma` + migration — **RF-07:** `code` NOT NULL, `@unique`, backfill strategy for null/duplicate rows.
- `src/features/product-configuration/services/**` or new resolver — `findFirst`/`findUnique` by `code` for server components / API.
- `src/app/api/product-configurations/**` — optional `GET` by `code` or extend list contract for exact code lookup; keep existing `[id]` routes for legacy and reuse after resolve.
- `src/features/distribution-commission/**` — hooks/pages that today assume `productConfigId: number`; parameterize base path (`/dashboard/distribucion-comisiones` vs `/dashboard/config-distribucion-comisiones`) and/or accept resolved `id`.
- `src/features/distribution-commission/components/commission-rules-table.tsx` — **RF-10:** replace ⋮ pattern with inline actions; preserve `assign-new-businesses` API.
- `src/features/product-configuration/components/product-configurations-table.tsx` — **single** CTA to code-first rules URL; **RF-09** column removal if present.
- `PRDs/MAPA-topic-ux-product-config-commission-prd.md` — M17 route naming and coexistence with legacy (source of truth).

### Approaches

1. **Minimal API change + client resolve**
   - Pros: Reuse `GET /api/product-configurations?search=<code>` then pick exact match in client; no new route handler required initially.
   - Cons: Ambiguous if multiple partial matches; pagination; not a true `findUnique` until RF-07 DB unique exists.
   - Effort: **Medium**

2. **Dedicated `GET /api/product-configurations/by-code/[code]` (or query `?code=`)**
   - Pros: Clear contract, 404 when missing, ready for deep links; server-side single round-trip.
   - Cons: New handler + tests; encoding rules for `code` in URL segment.
   - Effort: **Medium**

3. **Server-only resolve in layout for `[code]` routes**
   - Pros: No extra public API if using Prisma directly in RSC (still via **feature service**, not raw Prisma in random components — per project architecture).
   - Cons: Must enforce service layer; SSR error boundaries for unknown code.
   - Effort: **Medium–High**

### Recommendation

- Ship **RF-06 + M17 + RF-07** as one **epic**: menu item, new route prefix, empty state + combobox by code, and **schema migration** for `code` NOT NULL + unique with documented backfill — otherwise “deep link by code” and `findUnique` are fragile.
- In the same epic, implement **RF-10** on the **rules table** used by the new flow (and optionally align legacy table for consistency).
- **RF-08:** confirm in QA; no structural blocker.
- **RF-09** and **RF-11**: **parallel** tracks (different modules / larger scope); link **RF-09** only if adding deep links from Config. Producto list in the same release.

Prefer **Approach 2** for API clarity once RF-07 is in place; use **Approach 1** only as a temporary spike behind feature flag.

### Risks

- **Data migration:** Existing rows with `code = null` or duplicate codes block NOT NULL + `@unique` until cleaned.
- **URL encoding:** Codes may contain characters that need encoding in `[code]` dynamic segments; validate allowed charset vs `buildProductConfigurationCode` output.
- **Duplication drift:** Two UIs (legacy `id` vs new `code`) must share forms/hooks or fixes will diverge.
- **RF-10 product copy:** Button label must match PRD (“Asignada a nuevos negocios” vs current “Asignar a Nuevos Negocios”) — confirm with product.

### Ready for Proposal

**Yes.** Orchestrator should open **`/sdd-propose`** for change name e.g. `rf-06-config-distribucion-code-flow` with scope: M17 menu + new App Router tree + resolver by code + Prisma RF-07 migration + GET-by-code API + RF-10 table actions + product-list CTA on code route + **Buscar nueva distribución** on rules header; **exclude** deleting legacy id routes (optional bookmarks); **RF-11** optional follow-up change.

---

*Artifact: explore · OpenSpec `openspec/changes/explore-rf-06-bundle/exploration.md` · aligns with PRD MAPA M11, M17, RF-06–RF-10.*
