# Exploration: RF-01 — Presentación y comportamiento de porcentajes

**Base normativa:** `PRDs/financieramente-configuracion-comisiones-prd.md` §6 / §6.1 (RF-01, RF-05 relacionado) y `PRDs/MAPA-topic-ux-product-config-commission-prd.md` §D M4, §E, §J.

## Persistencia Engram (equipo)

- Este proyecto usa **Engram** además del repo: cada fase SDD debe **`mem_save`** con el mismo criterio que el PRD maestro del dominio.
- **Cambio SDD** `rf-01-presentacion-porcentajes`: artefacto exploración → `topic_key` **`sdd/rf-01-presentacion-porcentajes/explore`** · `project: financieramente-app`.
- **PRD / producto** (config comisiones): `topic_key` **`ux/product-config-commission-prd`** — al cerrar decisiones de RF-01, sincronizar PRD/MAPA **y** Engram.
- **Modo recomendado:** híbrido — archivos en `openspec/changes/...` **+** Engram (recuperación entre sesiones).

## Current State

- **Dominio en UI (0–100):** el formulario y Zod tratan el porcentaje como número **0–100** (`category-percentage-schema`); al API se transforma dividiendo entre 100 (`commission-rule-schemas.ts`).
- **Mapper de lectura:** `prismaCommissionRuleCategoryToDomain` convierte el `Decimal` de Prisma a “unidades %” con **`(rawPercentage * 100).toFixed(2)`** — fuerza **2 decimales** en cliente y **no** cumple “valor servidor sin redondear/truncar” ni “hasta 6 decimales / enteros con 4 decimales en pantalla” del PRD.
- **Input de fila C:** `CategoryPercentageRow` usa `<Input type="number">` con `value={field.value ?? ''}` y en `onChange` hace **`'' → 0`** — contradice RF-02 y el comportamiento de borrado del PRD. El símbolo **%** va en el **label** (“Porcentaje (%)”), no como adorno a la derecha del campo.
- **Listado de reglas:** `CommissionRulesTable` muestra `{cat.porcentajeDistribucion}%` en Badge — sin `Intl`, sin 4 decimales fijos para enteros, sin locale de app.
- **Total informativo:** `CommissionRuleForm` usa `totalPercentage.toFixed(4)%` — mezcla distinta al resto.
- **Persistencia:** `porcentajeDistribucion` y `porcentajePortfolio` son `@db.Decimal(5, 4)` — **4** decimales en BD, no **6** como pide RF-05; implica límite físico distinto al PRD.
- **Cross-módulo:** `pre-liquidacion/lib/format-utils.ts` define `formatPct` con **`Intl.NumberFormat('es-CO')`** y máx **2** fracciones; `liquidaciones/historico-liquidaciones.tsx` usa un `formatPercentage` local. **No** hay `next-intl` / `useLocale` en `src` (búsqueda vacía) — el locale “de la app” del PRD **no** está centralizado hoy.
- **Validación suma / mínimo:** el schema actual **no** exige suma ≤ 100 % ni mínimo 1; permite `min(0)` — gap frente a RF-05 actualizado.

## Affected Areas

- `src/features/distribution-commission/mappers/commission-rule.mapper.ts` — redondeo `.toFixed(2)` al mapear desde Prisma.
- `src/features/distribution-commission/lib/commission-rule-schemas.ts` — rangos, suma, transformación API.
- `src/features/distribution-commission/components/category-percentage-row.tsx` — `type="number"`, `''→0`, ausencia de adorno % y de máscara carácter a carácter.
- `src/features/distribution-commission/components/commission-rule-form.tsx` — total y posible validación de suma.
- `src/features/distribution-commission/components/commission-rules-table.tsx` — formato de solo lectura en badges.
- `prisma/schema.prisma` — `ProductPercentageCommissionCategory.porcentajeDistribucion` / `porcentajePortfolio` `Decimal(5,4)`.
- `src/app/api/product-configurations/.../distribution-commission/**` — contrato JSON y precisión (revisar en fase diseño/apply).
- **Otros módulos (RF-01 cross-módulo):** `src/features/pre-liquidacion/lib/format-utils.ts`, `ModalDetalleDistribucion.tsx`, `RegistrosLiquidacionTable.tsx`, `src/features/liquidaciones/components/historico-liquidaciones.tsx` — formateos fijos `es-CO` o ad hoc.

## Approaches

1. **Componente único `PercentageField` (shared) + util de formato única**
   - Pros: una sola implementación para adorno %, paste normalizado, restricción de caracteres, `aria-*` acordes a “solo número”; alineación cross-módulo.
   - Cons: hay que sustituir `type="number"` y revisar RHF/controladores; esfuerzo de regresión en tablas que solo formatean.
   - Effort: **Medium–High**

2. **Solo corregir `distribution-commission` (mapper + row + table) y dejar pre-liquidación/liquidaciones para otra tarea**
   - Pros: menor alcance inmediato.
   - Cons: **incumple** RF-01 explícito (“todos los módulos”); deuda documentada.
   - Effort: **Low–Medium**

3. **Capa `formatPercentageFromApi(value, locale)` + string mode input**
   - Pros: separa “número de dominio” vs “string de edición”; facilita no redondear en mapper (pasar string decimal desde API o Decimal serializado con precisión completa).
   - Cons: definir contrato API (string vs number) y migración BD si se pasa a 6 decimales.
   - Effort: **Medium**

## Recommendation

**Approach 1 + 3 combinados:** introducir utilidades de formato basadas en **locale de la app** (definir fuente: config de usuario, cookie, o `next-intl` cuando exista) y un **`PercentageField`** en `src/features/shared/` que cumpla adorno %, máscara, pegado y a11y. **Eliminar** `.toFixed(2)` del mapper en favor de preservar precisión del `Decimal` hasta el límite de BD (tras migrar a 6 decimales si el PRD se mantiene). Actualizar en **la misma iniciativa** al menos `format-utils` / histórico liquidaciones para no violar cross-módulo, o dividir en dos entregas con spec explícito de alcance.

## Risks

- **Migración `Decimal(5,4)` → mayor precisión** puede afectar redondeos en liquidaciones y seeds existentes.
- **`type="number"` vs string** cambia comportamiento de teclado móvil y validación; hay que alinear con Zod (coerción al submit).
- **Suma ≤ 100 % y mínimo 1** puede invalidar datos o reglas históricas con 0 % o sumas > 100; requiere estrategia de migración o backfill.
- **Incoherencia** si solo se arregla `distribution-commission` y no pre-liquidación/liquidaciones.

## Ready for Proposal

**Sí.** El siguiente paso SDD sería **`/sdd-propose`** (o `sdd-propose`) con change name `rf-01-presentacion-porcentajes`: alcance MVP (solo distribución vs cross-módulo completo), decisión de migración BD, y fuente de locale de la app.

## Post-apply (sdd-apply)

- **Datos legacy:** reglas con suma mayor que 100 o líneas bajo 1 % pueden fallar validación Zod al editar/guardar; definir auditoría SQL o backfill con negocio.
- **Migración Prisma** `Decimal(5,4)` → mayor precisión (p. ej. 6 decimales): PR aparte cuando producto lo confirme.
- **E2E Playwright** opcional para flujo crear regla (task 5.2) no ejecutado en este apply.

## Plan UX — administración profesional (distribución de comisiones)

**Referencia:** `ui-ux-pro-max` (accesibilidad, feedback de error, layout tipo admin/fintech).

### Decisión de producto (actual)

- **Estado activo/inactivo** de la regla **no se edita en el formulario** de crear/editar distribución; solo en el **listado** (`commission-rules-table`, `toggleActive`). Al guardar desde el formulario de edición se reenvía `active: initialData.active` para no cambiar el flag por esa vía.

### Implementación vigente

- **Errores de formulario:** `FormMessage` con color destructivo (`.text-destructive` en `globals.css`), icono `AlertCircle`, `role="alert"`; `SelectTrigger` y `PercentageField` con estilos `aria-invalid` alineados a `Input`.
- **`FormLabel`:** siempre `text-foreground` — los errores no tiñen el label; solo mensaje y borde del control.
- **`CommissionRuleForm`:** descripción con `max-w-2xl`; sin switch Activo en formulario; tarjeta de categorías `rounded-xl`, lista con **`divide-y`** y **padding vertical** (`py-6` / `py-5`) para que el separador no quede pegado a los inputs; pie de total con **`bg-muted/15`** y tipografía de total `text-lg` / `text-xl`; acciones con borde superior y botones full-width en móvil.
- **Suma > 100 %:** constante compartida `COMMISSION_RULE_CATEGORIES_SUM_MAX_MESSAGE` en `commission-rule-schemas.ts`; aviso en vivo bajo el total (`role="alert"`), total en rojo si excede; `toast` en `handleSubmit` inválido cuando la suma lo justifica.
- **Filas categoría:** `SelectTrigger` `h-9` alineado a porcentaje; botón eliminar `sm:self-center`, `aria-label`; imports actualizados según iteraciones.

### Página editar regla

- **`src/app/dashboard/distribucion-comisiones/[id]/reglas/editar/[ruleId]/page.tsx`:** eliminados título/subtítulo duplicados en página (`h2` + párrafo) y **`CardHeader`** (`CardTitle` / `CardDescription`); el título queda solo en **`DashboardLayout`** (`currentPage`). Card con `CardContent` y `pt-6`.

### Skeleton

- **`commission-rule-form-skeleton.tsx`:** una columna para descripción (sin segunda columna de Activo).

**Otros archivos ya citados en delta:** `specs/ui-system/spec.md` (errores de formulario admin); `form.tsx`, `select.tsx`, `percentage-field.tsx`, `category-percentage-row.tsx`, `commission-rule-form.tsx`, `globals.css`.
