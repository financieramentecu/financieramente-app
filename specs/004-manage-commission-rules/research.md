# Research: Gestión de Reglas de Comisión

**Branch**: `004-manage-commission-rules` | **Date**: 2026-02-12

## R-001: Prisma Model Rename Strategy

**Decision**: Rename Prisma model names only (not table/column names). Use `@@map` and `@map` to preserve existing database table and column names.

**Rationale**: Prisma allows model names to differ from table names via `@@map`. Since the tables already exist with the misspelled names (`product_percentaje_commision`, `product_percentaje_commision_category`), renaming only the Prisma model avoids a complex SQL migration. The `description` field addition is the only actual ALTER TABLE needed.

**Alternatives considered**:

- Full table rename via SQL migration: Rejected — high risk, requires updating FK constraints, indexes, and all `@@map` annotations. No functional benefit since `@@map` already decouples model from table name.
- Keep misspelled model names: Rejected per spec RF-015 — user requested correction.

**Implementation**:

1. In `schema.prisma`: rename `ProductPercentajeCommision` → `ProductPercentageCommission` (keep `@@map("product_percentaje_commision")`)
2. Rename `ProductPercentajeCommisionCategory` → `ProductPercentageCommissionCategory` (keep `@@map("product_percentaje_commision_category")`)
3. Rename field `idProductPercentajeCommision` → `idProductPercentageCommission` (keep `@map("id_product_percentaje_commision")`)
4. Update all relation field names accordingly
5. Add `description String? @db.VarChar(255)` to `ProductPercentageCommission`
6. Run `npx prisma migrate dev --name rename-ppc-models-add-description`
7. Run `npx prisma generate`
8. Update all TypeScript references across the codebase

**Impact on existing code**:

- `src/features/product-configuration/` — mapper, types, API routes reference old model names
- `src/app/api/product-configurations/[id]/ppcs/route.ts` — references `prisma.productPercentajeCommision`
- `src/features/negocios/` — likely references the PPC model via Business relation

---

## R-002: Percentage Conversion Pattern

**Decision**: UI accepts whole-number percentages (e.g., `15` for 15%). The API layer converts to fractions (`0.15`) before Prisma storage. The API returns fractions; the frontend converts back to whole numbers for display.

**Rationale**: Users think in percentages, not fractions. Keeping the conversion at the API boundary (Zod schema transform or mapper) provides a single source of truth. The existing `Decimal(5,4)` column supports values `0.0001` to `9.9999`, mapping to `0.01%` to `999.99%`.

**Alternatives considered**:

- Convert in the frontend only: Rejected — data inconsistency risk if multiple clients exist.
- Store as whole numbers (change schema): Rejected per clarification — maintain existing schema column type.

**Implementation**:

- Zod `createCommissionRuleSchema`: percentage field validates `0.01 <= value <= 999.99`, then `.transform(v => v / 100)` for API submission.
- Mapper `prismaToCommissionRule`: multiplies `porcentajeDistribucion * 100` when returning to frontend.
- Display in DataTable: show value directly from domain type (already converted).

---

## R-003: Nested API Route Pattern

**Decision**: Commission rule endpoints are nested under `/api/product-configurations/[id]/commission-rules/`. This follows REST resource nesting best practices since rules always belong to a configuration.

**Rationale**: The existing codebase already nests `/api/product-configurations/[id]/ppcs/` for the same resource type. Extending this pattern is consistent. Next.js App Router supports nested dynamic segments naturally.

**Alternatives considered**:

- Flat `/api/commission-rules?configId=X`: Rejected — loses the parent-child relationship in the URL and doesn't match existing patterns.

**Implementation**:

- `GET /api/product-configurations/[id]/commission-rules` — List rules (with category distributions)
- `POST /api/product-configurations/[id]/commission-rules` — Create rule + categories in transaction
- `GET /api/product-configurations/[id]/commission-rules/[ruleId]` — Single rule with categories
- `PUT /api/product-configurations/[id]/commission-rules/[ruleId]` — Update rule + categories (replace all)
- `PATCH /api/product-configurations/[id]/commission-rules/[ruleId]` — Toggle active status
- `POST /api/product-configurations/[id]/commission-rules/[ruleId]/assign-new-businesses` — Assign as default

---

## R-004: Aggregation Mode UI Pattern

**Decision**: The rule creation/edit form uses a two-section layout: top section for rule metadata (description), bottom section for a dynamic table of category-percentage rows. Users add rows incrementally. Saving persists the entire rule + categories in a single API call.

**Rationale**: This matches the spec RF-013 "aggregation mode" requirement. A single save ensures atomicity — either the entire rule with all categories is saved, or nothing. React Hook Form's `useFieldArray` handles dynamic rows natively.

**Alternatives considered**:

- Save categories individually (per-row auto-save): Rejected — creates partial states, violates atomicity requirement.
- Modal-based category addition: Rejected — more clicks, worse UX for batch entry.

**Implementation**:

- `useFieldArray` from React Hook Form for the categories list
- Each row: Category select (from active categories) + percentage number input + remove button
- "Add Category" button appends a new empty row
- Zod validation on submit: all rows must have category and valid percentage, no duplicate categories
- POST/PUT sends `{ description, categories: [{ idCategory, percentage }] }`

---

## R-005: Business Association Check for Deactivation

**Decision**: Before toggling a rule to `active = false`, the API checks if any `Business` records reference this rule. If yes, return 409 Conflict with a descriptive error. The frontend shows a blocking alert.

**Rationale**: Per spec RF-006 and RF-011, deactivation must be blocked when businesses are associated. The `Business` model has a direct FK `idProductPercentajeCommision` → `ProductPercentageCommission`. A simple count query is sufficient.

**Alternatives considered**:

- Allow deactivation with warning only: Rejected per spec — must block, not just warn.
- Check on frontend only: Rejected — must enforce at API level for data integrity.

**Implementation**:

```typescript
// In PATCH handler:
const businessCount = await prisma.business.count({
	where: { idProductPercentageCommission: ruleId },
})
if (businessCount > 0 && !newActiveStatus) {
	return NextResponse.json(
		{
			data: null,
			error: 'No se puede desactivar: existen negocios asociados.',
		},
		{ status: 409 }
	)
}
```

---

## R-006: Default New Business Rule Assignment

**Decision**: A dedicated POST endpoint `/assign-new-businesses` updates `ProductConfiguration.idProductPercentageCommissionNewBusinesses` to point to the specified rule. Only one rule can be the default at a time (enforced by the FK unique constraint already in schema).

**Rationale**: This is a separate action from CRUD on the rule itself. The spec (HU-3, scenario 3) requires an explicit button in the rules list. Using a dedicated endpoint makes the intent clear and avoids overloading the PUT/PATCH endpoints.

**Alternatives considered**:

- Include in the rule PATCH endpoint: Rejected — conflates two different operations (toggle active vs assign default).
- Client-side call to update ProductConfiguration directly: Rejected — would need a separate product-configuration update endpoint, coupling features unnecessarily.

**Implementation**:

- `POST /api/product-configurations/[id]/commission-rules/[ruleId]/assign-new-businesses`
- Validates that the rule belongs to the configuration and is active
- Updates `ProductConfiguration.idProductPercentageCommissionNewBusinesses = ruleId`
- Returns updated ProductConfiguration

---

## R-007: Sidebar Navigation Strategy

**Decision**: Add a new menu item "Config. Distribución comisión" under the "Administración" section in `src/lib/navigation/menu-items.tsx`, pointing to `/dashboard/configuraciones-producto`. This ensures direct access as requested in RF-016, leveraging the existing route for Product Configurations.

**Rationale**: The user explicitly requested this access point. While "Config. Producto" already exists and points to the same location, adding the explicit label "Config. Distribución comisión" improves discoverability for this specific workflow without breaking existing habits.

**Alternatives considered**:

- Renaming "Config. Producto": Rejected — might confuse users looking for general product configuration settings not related to commissions.
- Top-level item: Rejected — keeps the sidebar clean; "Administración" is the logical home for configuration.

**Implementation**:

- Update `ALL_MENU_ITEMS` in `src/lib/navigation/menu-items.tsx`.
- Add `{ title: 'Config. Distribución comisión', url: '/dashboard/configuraciones-producto', icon: <Sliders ...> }`.
