# Tasks: RF-01 Percentage presentation and behavior

## Phase 1: Foundation

- [x] 1.1 Add `src/features/shared/lib/app-locale.ts` with `getAppLocale(): string` returning `'es-CO'` and a one-line comment for future user override.
- [x] 1.2 Add `src/features/shared/lib/format-percent.ts`: `formatPercentDisplay(percent0to100, locale?)` per PRD (no client round/truncate of server value; pad integers to 4 dp; trailing `%` in return string).
- [x] 1.3 Add `normalizePercentPaste(raw: string, locale: string): string` (or parse to number) with Vitest cases for `12,5 %`, `12.5%`, invalid chars.
- [x] 1.4 Add `src/features/shared/ui/percentage-field.tsx`: text input, `inputMode="decimal"`, trailing `%` adornment, max 4 fractional digits while typing, paste handler using 1.3, `value`/`onChange` as `number | undefined`, no `''→0`.

## Phase 2: Core — distribution commission

- [x] 2.1 Update `src/features/distribution-commission/mappers/commission-rule.mapper.ts`: replace `.toFixed(2)` with Prisma-safe multiply-by-100 (use `Decimal` from `@prisma/client/runtime/library` or equivalent) without arbitrary rounding.
- [x] 2.2 Update `src/features/distribution-commission/lib/commission-rule-schemas.ts`: `percentage` `.min(1).max(100)`; `superRefine` on category lines so sum of `percentage` ≤ 100; clear error messages (Spanish copy OK for UI).
- [x] 2.3 Replace percentage `Input` in `src/features/distribution-commission/components/category-percentage-row.tsx` with `PercentageField` wired to RHF `FormField`.
- [x] 2.4 Update `src/features/distribution-commission/components/commission-rules-table.tsx` badges to use `formatPercentDisplay(cat.porcentajeDistribucion, getAppLocale())`.
- [x] 2.5 Update total line in `src/features/distribution-commission/components/commission-rule-form.tsx` to use `formatPercentDisplay` (or shared total helper) instead of ad hoc `toFixed(4)`.

## Phase 3: Cross-module read-only

- [x] 3.1 Refactor `src/features/pre-liquidacion/lib/format-utils.ts` so `formatPct(fraction)` calls `formatPercentDisplay(fraction * 100, getAppLocale())` (keep existing call sites).
- [x] 3.2 Replace local `formatPercentage` in `src/features/liquidaciones/components/historico-liquidaciones.tsx` with `formatPercentDisplay` + `getAppLocale()` for the same semantic values.

## Phase 4: Tests

- [x] 4.1 Vitest: `commission-rule.mapper` — fixture Decimal values ×100 match expected domain numbers without 2dp loss.
- [x] 4.2 Vitest: `commission-rule-schemas` — reject 0, >100, sum 101; accept sum 100 and valid lines.
- [x] 4.3 Vitest: `format-percent.ts` — integer padding, fractional preservation, locale separator smoke.
- [x] 4.4 RTL: `PercentageField` — empty stays empty, paste normalizes, blur commits `undefined` or number.

## Phase 5: Optional / follow-up

- [x] 5.1 Document open design items in `exploration.md` or PR comment: legacy data policy; optional Prisma `Decimal(5,4)` → `(8,6)` migration (separate PR).
- [ ] 5.2 (Optional) Playwright smoke: create commission rule with two lines summing to 100 on `/dashboard/distribucion-comisiones/.../reglas/crear`.

## Phase 6: UX admin (distribución de comisiones)

- [x] 6.1 Errores de formulario visibles (`.text-destructive` en `globals.css`, `FormMessage` con icono + `role="alert"`, `aria-invalid` en Select y `PercentageField`).
- [x] 6.2 `FormLabel` sin color destructivo en error (`text-foreground` fijo en `form.tsx`).
- [x] 6.3 Suma de porcentajes > 100 %: mensaje en vivo + total en rojo; `COMMISSION_RULE_CATEGORIES_SUM_MAX_MESSAGE` en schema; toast en submit inválido cuando aplica.
- [x] 6.4 Filas de categoría: `divide-y` + padding vertical; `SelectTrigger` `h-9`; tarjeta categorías y pie de total (`bg-muted/15`); ajustes de alineación botón eliminar.
- [x] 6.5 Iteración layout descripción / Activo (divide-x, label Activar–Desactivar); **luego retirado** el campo `active` del formulario — solo lista; `update` usa `initialData.active`.
- [x] 6.6 Página `reglas/editar/[ruleId]`: sin duplicar título (quitar `h2`, párrafo y `CardHeader`); título vía `DashboardLayout`.
- [x] 6.7 `commission-rule-form-skeleton` alineado a formulario sin columna Activo.

Ver detalle y decisiones en `exploration.md` § **Plan UX — administración profesional**.
