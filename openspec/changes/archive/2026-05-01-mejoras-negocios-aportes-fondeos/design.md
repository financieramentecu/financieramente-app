# Design: Mejoras en Negocios — Aportes y Fondeos

## Technical Approach

Generalizar el flujo "anualidades" (hoy ligado a `AnnualPayment` + periodicidad `Anual`) a **aportes** parametrizados por periodicidad. La estrategia es:

1. **Renombrar el modelo Prisma** `AnnualPayment` → `Payment` con `@@map("payments")`, agregando `expectedDate`. La migración usa `RENAME TABLE` para preservar PKs/FKs y datos.
2. **Helper puro** `calculateNumAportes(termYears, periodicidadName, companyName, productName)` que devuelve `term * multiplier` con excepciones de negocio. Persistir el resultado en `Business.numAportes` al crear.
3. **Calcular fechas esperadas al primer fondeo** (no en creación) usando `date-fns/addMonths`, persistiéndolas en transacción atómica con la transición `EMITIDO → FONDEADO`.
4. **Renombrar `AnnualFundingModal` → `FundingModal`** con UI compacta para fondeados + scroll. Si `numAportes ∈ {0, 1}`, el contenedor invoca acción directa sin abrir el modal.
5. **Permisos**: separar `canViewPayments` (incluye AGENTE) de `canFundPayments` (excluye AGENTE).

## Architecture Decisions

### Decision: Estrategia de rename de tabla

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| `@@map("payments")` + `RENAME TABLE` SQL en migration | Preserva datos, FKs, PK auto-increment; type-safety completa | **Elegida** |
| Crear tabla nueva + COPY + DROP | Doble storage transitorio; rompe FKs durante migración | Rechazada |
| Solo `@@map` sin renombrar tabla física | Type-safe pero queda desfasado del schema real | Rechazada |

**Rationale**: Prisma soporta nativamente `@@map` y la migración manual con `RENAME TABLE` en PostgreSQL es atómica y no invalida FKs.

### Decision: ¿Cuándo persistir `expectedDate`?

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Calcular las N fechas al **primer fondeo** (anchor = `dateAnchored` del primer aporte) | Una sola fuente de verdad temporal; sin recalcular si cambia plazo antes de fondear | **Elegida** |
| Calcular al crear el negocio (anchor = `dateIssued`) | Permite ver fechas antes de fondear, pero requiere recalcular si se edita | Rechazada |
| Calcular on-the-fly en cada lectura | Sin storage; pero rompe consistencia si cambian inputs | Rechazada |

**Rationale**: Las fechas reales sólo cobran sentido cuando hay un punto de anclaje real (primer pago efectivo). Antes de fondear las fechas son irrelevantes para el negocio.

### Decision: Cálculo de fechas con end-of-month

**Choice**: `date-fns/addMonths(anchorDate, monthIncrement * (i - 1))` para cada aporte `i`. `monthIncrement` = `12 / multiplier` (Anual=12, Semestral=6, Cuatrimestral=4, Trimestral=3, Bimestral=2, Mensual=1).
**Alternatives**: librería propia con manejo manual; `Date.setMonth` (rompe en 31-ene → 03-mar).
**Rationale**: `addMonths` ya maneja correctamente leap years y end-of-month clamping (31-ene + 1mes = 28/29-feb).

### Decision: Permisos read-only para AGENTE

**Choice**: dos helpers separados en `roles.ts`:
- `canViewPayments(role): boolean` → incluye AGENTE
- `canFundPayments(role): boolean` → excluye AGENTE
La UI usa `canFundPayments` para ocultar el botón "Fondear"; el endpoint POST verifica también server-side.
**Alternatives**: bandera única `canFund` con guard sólo en UI (rechazada — saltable vía request directo).
**Rationale**: defense-in-depth (UI + API) y separación clara de capabilities.

### Decision: Reactividad de `numAportes` en el formulario

**Choice**: `useEffect` en `BusinessInfoSection` observando `term`, `periodicityId`, `companyId`, `productId`. Llama a `calculateNumAportes` y hace `setValue('numAportes', n, { shouldValidate: false })` en RHF.
**Alternatives**: Zod `.transform` (rechazado — Zod no tiene acceso a nombres legibles de company/product).
**Rationale**: el cálculo necesita resolver nombres (no IDs), y es mejor mantenerlo en la capa de UI/hooks.
**Interfaz** Agregar el campo al lado izquierdo del campo Moneda bloqueado, el usuario no lo puede cambair.

### Decision: Comportamiento del modal con `numAportes ∈ {0, 1}`

**Choice**: el contenedor `BusinessTableContainer` chequea `numAportes` antes de abrir el modal. Si `≤ 1`, llama directamente a `POST /fondear-aportes` con `fundedInstallmentIndexes = [1]` (o `[]` si es 0 → backend hace fondeo "directo" del padre).
**Rationale**: simplifica UX y evita un modal vacío.

## Data Flow

```
Form (BusinessInfoSection)
   │  watch(term, periodicityId, companyId, productId)
   ▼
calculateNumAportes() ─→ setValue('numAportes')
   │
   ▼
createBusiness(action) ─→ INSERT business{numAportes} + N payments(SIN_FONDEAR, expectedDate=null)
                                                         │
User clicks "Fondear" ────────────────────────────────── ▼
   │
   ▼
canFundPayments(role)? ──no──→ 403
   │ yes
   ▼
POST /api/negocios/[id]/fondear-aportes
   │  TX: UPDATE payments SET status,dateAnchored
   │       IF first funding → calculateExpectedDates() + UPDATE all payments SET expectedDate
   │       UPDATE business status,dateAnchored
   ▼
Return BusinessEntity (with expectedDates)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Renombrar `AnnualPayment` → `Payment`, `@@map("payments")`; agregar `Business.numAportes Int?`, `Payment.expectedDate DateTime?` |
| `prisma/migrations/{ts}_rename_payments/migration.sql` | Create | `RENAME TABLE annual_payment TO payments`, `ADD COLUMN num_aportes`, `ADD COLUMN expected_date`, backfill `numAportes` |
| `src/features/negocios/lib/calculate-num-aportes.ts` | Create | Helper puro con multiplicadores + excepciones |
| `src/features/negocios/lib/calculate-expected-dates.ts` | Create | Helper puro con `date-fns/addMonths` |
| `src/features/negocios/lib/business-form-schemas.ts` | Modify | Agregar `numAportes: z.number().int().min(0)` |
| `src/features/negocios/components/sections/business-info-section.tsx` | Modify | Campo read-only "Número de Aportes" + `useEffect` reactivo |
| `src/features/negocios/actions/create-business.ts` | Modify | Persistir `numAportes`; reemplazar `tx.annualPayment.createMany` con `tx.payment.createMany` usando `numAportes` |
| `src/features/negocios/components/modals/FundingModal.tsx` | Rename | Desde `AnnualFundingModal.tsx`; labels "Aporte N", sección compacta para fondeados, scroll |
| `src/app/api/negocios/[id]/payments/route.ts` | Rename | Desde `annual-payments/`; incluir `expectedDate` en DTO |
| `src/app/api/negocios/[id]/fondear-aportes/route.ts` | Rename | Desde `fondear-anualidades/`; calcular y persistir `expectedDate` en primer fondeo; quitar `AGENTE` de `FONDEAR_ALLOWED_ROLES` |
| `src/features/auth/lib/roles.ts` | Modify | Agregar `canViewPayments` y `canFundPayments` |
| `src/features/negocios/types/business-api.types.ts` | Modify | Renombrar a `PaymentInstallmentDto`, agregar `expectedDate` |
| `src/features/negocios/types/business-entity.types.ts` | Modify | `numAportes`, renombrar `hasAnnualPayments` → `hasPayments`, `hasPendingAnnualFunding` → `hasPendingPaymentFunding` |

## Interfaces / Contracts

```ts
// calculate-num-aportes.ts
export function calculateNumAportes(input: {
  termYears: number | null
  periodicityName: string | null
  companyName: string | null
  productName: string | null
}): number {
  // Excepciones primero
  if (companyName === 'SKANDIA' && productName === 'MFUND') return 0
  if (periodicityName === 'Pago Único' || periodicityName === 'Aportes Ocasionales') return 0
  if (termYears == null || periodicityName == null) return 0

  const multipliers: Record<string, number> = {
    Anual: 1, Semestral: 2, Cuatrimestral: 3,
    Trimestral: 4, Bimestral: 6, Mensual: 12,
  }
  return termYears * (multipliers[periodicityName] ?? 0)
}

// calculate-expected-dates.ts
export function calculateExpectedDates(
  anchorDate: Date,
  numAportes: number,
  periodicityName: string,
): Date[] {
  const monthIncrements: Record<string, number> = {
    Mensual: 1, Bimestral: 2, Trimestral: 3,
    Cuatrimestral: 4, Semestral: 6, Anual: 12,
  }
  const inc = monthIncrements[periodicityName] ?? 0
  return Array.from({ length: numAportes }, (_, i) => addMonths(anchorDate, inc * i))
}

// PaymentInstallmentDto
interface PaymentInstallmentDto {
  installmentIndex: number
  status: 'SIN_FONDEAR' | 'FONDEADO'
  dateAnchored: string | null
  expectedDate: string | null
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | `calculateNumAportes` (cada periodicidad + excepciones SKANDIA/MFUND/Pago único) | Vitest, table-driven |
| Unit | `calculateExpectedDates` (leap year, end-of-month 31-ene → 28-feb, todas las periodicidades) | Vitest con casos border |
| Unit | `canViewPayments` / `canFundPayments` (todos los roles) | Vitest |
| Integration | `createBusiness` persiste `numAportes` correcto + crea N rows en `payments` | Vitest con prisma mock |
| Integration | `POST /fondear-aportes` calcula y persiste `expectedDate` sólo en primer fondeo (idempotencia) | Vitest + supertest-like |
| Integration | `POST /fondear-aportes` retorna 403 para AGENTE | Vitest |
| E2E | Flujo Mensual 5 años → 60 aportes; primer fondeo 31-ene-2025 → 28-feb correcto | Playwright |
| E2E | Coach abre modal en modo read-only (sin botón Fondear) | Playwright |

## Migration / Rollout

1. **Schema migration** (`RENAME TABLE annual_payment TO payments` + `ADD COLUMN`s nullable).
2. **Backfill `numAportes`**: SQL en la misma migración: `UPDATE business b SET num_aportes = (SELECT COUNT(*) FROM payments WHERE id_business = b.id_business)` para negocios con pagos. Para negocios sin pagos: `numAportes = NULL` (se calculará en próximas ediciones, sin retroactivo).
3. **Sin feature flag**: el rename es transparente; legacy queries deben actualizarse en el mismo PR (`tx.annualPayment` → `tx.payment` en todo el código).
4. **Rollback**: `RENAME TABLE payments TO annual_payment` + `DROP COLUMN num_aportes`, `DROP COLUMN expected_date`. Las columnas son nullable, rollback no destruye datos pre-existentes.
5. **Coordinación**: deploy en ventana de mantenimiento corta; el rename SQL es instantáneo en PostgreSQL.

## Resolved Decisions

- **SKANDIA + MFUND**: hardcoded. Además, cuando aplica esta excepción el campo "Plazo en años" también se bloquea en 0.
- **Nombres exactos en BD**: `"Pago Único"` y `"Aportes Ocasionales"` (con tilde y mayúsculas).
- **AuditAction**: renombrar `BUSINESS_ANNUAL_FUNDED` → `BUSINESS_PAYMENT_FUNDED`. ✅
