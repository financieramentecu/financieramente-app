# Proposal: Pre-liquidation beneficiary per category and clawback alignment

## Intent

Policy pre-liquidation today assigns every `Clawback.idUser` to the business owner and the distribution modal shows category names only. Product rules require mapping each `ProductPercentageCommissionCategory` row to a beneficiary: either a user matched on the upline chain, or a **fixed user** configured on the category (pool / company / any system user). **Every** distribution row must persist a concrete `User` (never null).

## Category beneficiary mode (generic fixed user)

**Decision**: Use a **small enum** plus an **optional FK** on `Category` so we are not tied to a single “Agencia” user in the type system.

| `beneficiaryMode` | Meaning | Resolver behavior |
|-------------------|---------|-------------------|
| `UPLINE_CHAIN` | Person in the sales hierarchy | Exactly one user in `[business.user, leader, …]` with `User.idCategoria === Category.idCategory` (match order in design/spec). If none → **block that settlement row** (no PRE-SETTLED). |
| `FIXED_BENEFICIARY` | Not resolved by chain | Beneficiary is **always** `Category.idFixedBeneficiaryUser` (required when this mode is set; validated in app/DB). |

**If another system user is added** (e.g. second pool, treasury bot user): create the `User`, set the relevant `Category` rows to `FIXED_BENEFICIARY` and `idFixedBeneficiaryUser = <that user>`. No new enum variant and no new code path per user—only data.

**Agencia today**: category `AGENCIA` (and any similar) uses `FIXED_BENEFICIARY` + `idFixedBeneficiaryUser` pointing at the seeded `agencia@financieramentecu.com` user.

**Implementation**: `Category.beneficiaryMode` NOT NULL (default `UPLINE_CHAIN`). `Category.idFixedBeneficiaryUser` nullable FK to `User`. Resolver never hardcodes email except optional bootstrap/seed.

### Invariants: `FIXED_BENEFICIARY` must have a user

| Rule | Description |
|------|-------------|
| **IF** `beneficiaryMode === FIXED_BENEFICIARY` | **THEN** `idFixedBeneficiaryUser` **MUST** be set to an existing, active `User` (product may allow inactive users only if explicitly decided—default: active). |
| **IF** `beneficiaryMode === UPLINE_CHAIN` | **THEN** `idFixedBeneficiaryUser` **SHOULD** be `NULL` (ignored by resolver; if set, implementation **must ignore** it to avoid two sources of truth). |
| **Pre-liquidación** | Before creating any `ComissionDistribution` for a row, validate every `ProductPercentageCommissionCategory → Category` used: if `FIXED_BENEFICIARY` and FK is null or user missing → **fail fast** for that `SettlementCommission` (block record; do not partial-write distributions). |
| **Seeds / migrations** | Every category seeded as `FIXED_BENEFICIARY` must resolve `idFixedBeneficiaryUser` after users exist (order: users → categories with FK). |

**Validation layers** (apply in this order where relevant):

1. **Resolver / service** — authoritative at runtime; throws or returns structured error → `procesarPreLiquidacion` skips that commission and logs a clear reason (e.g. `Category {code}: FIXED_BENEFICIARY sin idFixedBeneficiaryUser`).
2. **Seed scripts** — assert non-null FK for fixed categories before commit.
3. **Optional later**: Zod (or Prisma middleware) on admin “update category”; DB `CHECK` `(beneficiary_mode != 'FIXED_BENEFICIARY') OR (id_fixed_beneficiary_user IS NOT NULL)` for hard guarantee.

**Prisma note**: The FK may stay `Int?` in schema because `UPLINE_CHAIN` rows leave it null; **business rules** enforce “required when FIXED,” not the column’s SQL nullability alone—unless a `CHECK` is added as above.

> **Note**: If Prisma already introduced `SYSTEM_AGENCIA`, migrate enum to `FIXED_BENEFICIARY` and replace usages; semantics are identical but extensible.

## Scope

### In Scope

- **Prisma**: `BeneficiaryMode` (`UPLINE_CHAIN` | `FIXED_BENEFICIARY`); `Category.idFixedBeneficiaryUser`; `ComissionDistribution.idBeneficiaryUser` NOT NULL after backfill; `Clawback.idUser` aligned with beneficiary when clawback exists.
- Resolver: `UPLINE_CHAIN` → chain match or block record; `FIXED_BENEFICIARY` → require non-null `idFixedBeneficiaryUser`, else block record; ignore fixed FK when `UPLINE_CHAIN`.
- `procesarPreLiquidacion` + origin-recalc: set `idBeneficiaryUser` / `Clawback.idUser` from resolver.
- `obtenerDistribucionComision` + types + `ModalDetalleDistribucion`: beneficiary per row.
- Seeds: categories with correct mode; Agencia user + `AGENCIA` category linked via `idFixedBeneficiaryUser`; `.env.example` for `AGENCIA_USER_PASSWORD`.
- **Partial advance — file waits for full PRE-SETTLED**: `procesarPreLiquidacion` processes all `SYNCHRONIZED` registros in the file. Registros that succeed are individually moved to `PRE-SETTLED`. Registros that fail due to a **configuration error** (`FIXED_MISSING_USER`, `UPLINE_NO_MATCH`, `FIXED_USER_INACTIVE`) remain `SYNCHRONIZED` — their distributions and clawbacks are NOT written. After processing, `FileImport.status` advances to `PRE-SETTLED` **only if zero `SYNCHRONIZED` registros remain** for that file. If any remain, the file stays in its current state. Re-running pre-liquidation on the same file only processes remaining `SYNCHRONIZED` records — already-`PRE-SETTLED` records are untouched (existing behavior).
- **Configuration error report (modal)**: When `procesarPreLiquidacion` finishes with at least one configuration error, the API response SHALL include `registrosConError: { idSettlementCommission, categoryCode, errorCode, contrato, idBusiness }[]`. The pre-liquidación UI **SHALL** display this list in a dismissible modal immediately after the operation, showing the operator which records to fix and why. The modal SHALL only appear when `registrosConError.length > 0`. Each row in the modal SHALL display: ID Liquidación (as a link to `/dashboard/negocios/editar/{idBusiness}`), Contrato (`Business.contract`), Agente (as a link to `/dashboard/admin/users/{idUserAgent}` to edit the business owner's user configuration), Categoría, and Motivo del error. The `registrosConError` payload SHALL include `idBusiness`, `idUserAgent`, and `contrato` so all links are available without additional requests.
- **Category administration (admin)**: surfaces where `Category` is created/updated SHALL expose `beneficiaryMode` and, when applicable, the fixed beneficiary user (`idFixedBeneficiaryUser`). Primary routes: **`/dashboard/categorias/crear`**, **`/dashboard/categorias/editar/[id]`**, backed by **`src/app/api/categories`** (POST/PUT/PATCH as implemented). Any server action or form that persists `Category` MUST stay aligned with resolver rules (`FIXED_BENEFICIARY` ⇒ non-null active fixed user when saving). When `beneficiaryMode === FIXED_BENEFICIARY`, the form **MUST** present a **`<Select>` populated with active users** (name + email) fetched from the system — operators **MUST NOT** type a raw numeric ID. The select SHALL only list active users. The resolved `idFixedBeneficiaryUser` (the user's ID) is what gets persisted.
- **Category type display — “Sistema”**: Where the UI shows the **category type** (`Category` → `CategoryType` / “tipo de categoría”), if that type is the **system** type (product-defined convention: `CategoryType.name === 'SISTEMA'`), the UI **SHALL** also show the **linked system user** for that category: resolved from `idFixedBeneficiaryUser` with **read-only** display fields (name, email). This applies to both the **list view** (`/dashboard/categorias`) and the **form** (crear/editar). In the list, categories of system type SHALL eagerly load and display the assigned user alongside the category row — the `GET /api/categories` response MUST include `fixedBeneficiaryUser` so no extra request is needed. For non-system types, showing the linked user is optional; for **system** type, it is **required** when `beneficiaryMode === FIXED_BENEFICIARY` and a fixed user is configured.

- **Origin change validation — PPC must exist for new combination**: Before allowing a business's `clientOrigin` to change, the system **SHALL** verify that a `ProductConfiguration` row exists for the combination **Category (business) + Product + new Origin**. If no matching `ProductConfiguration` exists (and therefore no PPC with distribution rules), the change **MUST be rejected** with a clear error message explaining that no distribution configuration exists for that origin/product/category combination. The error SHALL surface in the UI so the operator knows they must first create the configuration before switching the origin. This validation applies to: `PUT /api/negocios/[id]` when `idClientOrigin` changes, and any server action that persists the origin change. The check runs **before** the recalculation transaction — if the lookup fails, no commission records are touched.

### Out of Scope

- Liquidation / `ClawbackBalance`.
- Changing voluntarias / `POLIZA_CLAW` beyond aligning persisted users when applicable.
- Defining the exact catalog value for “system” `CategoryType` beyond product convention (name/code/flag) — implementation picks one and documents it in admin copy.

## Approach

Shared lib: upline list with cycle guard + max depth. `resolveBeneficiary({ category, chain })` branches on `category.beneficiaryMode`, enforcing **FIXED_BENEFICIARY ⇒ non-null `idFixedBeneficiaryUser`** before returning an id. Persist on `ComissionDistribution.idBeneficiaryUser`; reuse for `Clawback.idUser`. API joins `User` for display.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Enum, `Category` fields, `ComissionDistribution.idBeneficiaryUser` |
| `prisma/migrations/*` | New | Backfill + NOT NULL |
| `src/features/pre-liquidacion/...` | Modified | Resolver, service, UI, types; block-file on config error; error report modal |
| `prisma/seeds/category.ts` | Modified | Mode + `idFixedBeneficiaryUser` where fixed |
| `openspec/specs/pre-liquidacion/spec.md` | Modified | Delta |
| `src/app/dashboard/categorias/**` (crear / editar) | Modified | Form + UI: beneficiary fields; when `CategoryType` is system, show linked `fixedBeneficiaryUser` |
| `src/features/categories/**` (forms, schemas, actions) | Modified | Persist/read `beneficiaryMode`, `idFixedBeneficiaryUser`; optional include `fixedBeneficiaryUser` for display |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Category `FIXED_BENEFICIARY` with null FK | Low | Block record; seed asserts; optional DB CHECK |
| `UPLINE_CHAIN` with spurious `idFixedBeneficiaryUser` | Low | Resolver ignores FK; seeds prefer NULL |
| Incomplete upline for `UPLINE_CHAIN` | Med | Block record; clear message |
| Enum rename from prior draft | Low | One migration + find/replace |
| Ambiguous “system” `CategoryType` | Low | Lock convention (name, code, or DB flag) in admin docs and seeds |

## Rollback Plan

Revert migration(s) if safe; else forward-fix. Code rollback leaves columns unused.

## Dependencies

- Seeded users for each fixed-beneficiary category (at minimum Agencia for `AGENCIA`).

## Success Criteria

- [ ] Resolver supports `UPLINE_CHAIN` and `FIXED_BENEFICIARY` only; fixed path uses FK, not hardcoded user id (except tests/seed).
- [ ] **`FIXED_BENEFICIARY` without `idFixedBeneficiaryUser`** → settlement row blocked; no distributions persisted for that row.
- [ ] **`UPLINE_CHAIN`** never reads `idFixedBeneficiaryUser` (or it is always null in seeds).
- [ ] Adding a new system user for a new pool category requires **data only** (new `User` + category FK), no enum change.
- [ ] Every new `ComissionDistribution` has non-null `idBeneficiaryUser`.
- [ ] `Clawback.idUser` matches beneficiary where clawback exists.
- [ ] Unit tests: both modes, cycle, missing upline (blocked), **FIXED_BENEFICIARY + null FK (blocked)**, invalid user id (blocked).
- [ ] **Partial advance**: successful registros move to `PRE-SETTLED` individually; failed registros stay `SYNCHRONIZED`; `FileImport` advances to `PRE-SETTLED` only when ALL registros in the file are `PRE-SETTLED`.
- [ ] **Error report in response**: `procesarPreLiquidacion` returns a list of `registrosConError: { idSettlementCommission, categoryCode, errorCode }[]` when failures occur.
- [ ] **Modal in UI**: Pre-liquidación UI shows a modal with the error list after the operation; modal only appears when `registrosConError.length > 0`.
- [ ] Delta spec: invariants table, validation layers, block-record behavior.
- [ ] Admin category create/edit shows beneficiary mode; when `FIXED_BENEFICIARY`, shows a `<Select>` with active users (name + email) — no raw ID input.
- [ ] **System** `CategoryType` (`SISTEMA`) shows linked system user in both the list (`/dashboard/categorias`) and the create/edit form; list loads user from the API response without extra requests.
- [ ] **Pre-liquidación UI polish**: `RegistrosLiquidacionTable` uses `formatCurrency` (COP, `$` prefix, thousand separators), boolean badges for Es Clawback/Rezagado, readable dates, alternating rows, sticky-styled header, action buttons with icons. `ModalDetalleDistribucion` uses stat cards for summary, totals row in distribution table, currency formatting throughout. Shared utilities in `src/features/pre-liquidacion/lib/format-utils.ts`.
- [ ] **Distribution modal header category**: The "Categoría" stat card in `ModalDetalleDistribucion` SHALL show `ProductConfiguration.category.name` (the business configuration category — the combination Category + Product + Origin used to perform the distribution), NOT the first distribution row's category. The `obtenerDistribucionComision` service MUST include `productConfiguration → category` and map `categoria` from there. This correctly identifies which PPC configuration rule was applied, and stays aligned when `recalcularComisionesPorCambioOrigen` updates the business's PPC reference on origin change.
