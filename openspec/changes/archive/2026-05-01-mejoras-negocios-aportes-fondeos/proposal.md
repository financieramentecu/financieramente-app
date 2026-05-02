# Proposal: Mejoras en Negocios — Aportes y Fondeos

## Intent

El flujo actual de "anualidades" sólo soporta periodicidad **Anual** y oculta a los usuarios la cantidad real de aportes que generará un negocio según su periodicidad. Hay que (1) hacer visible y persistente el **número de aportes** desde la creación, (2) generalizar el modelo a **cualquier periodicidad** renombrando `anual_payment` → `payments`, (3) calcular y persistir las **fechas esperadas** de cada aporte al primer fondeo, y (4) ajustar permisos para que el rol Coach (AGENTE) sólo visualice aportes sin poder fondear.

## Scope

### In Scope
- Campo read-only **"Número de Aportes"** en formulario de creación + persistencia en `Business.numAportes`.
- Renombrar tabla `anual_payment` → `payments`; agregar columnas `expected_date` (futura) y mantener `date_anchored` (real).
- Cálculo de fechas esperadas al **primer aporte** (manejo leap-year + end-of-month).
- Modal renombrado `FundingModal` con labels "Aporte N" + UI compacta para aportes ya fondeados + scroll.
- Botón directo "Fondear" cuando `numAportes ∈ {0, 1}` (sin modal).
- Mostrar plazo, periodicidad y fechas esperadas en detalle del negocio.
- Restricción de rol: AGENTE sólo lectura en aportes; ADMIN y ASISTENTE_GERENCIA_OPERATIVA pueden fondear.

### Out of Scope
- Edición manual de fechas de aportes ya calculadas.
- Notificaciones automáticas de aportes vencidos.
- Reversión (downgrade) de aportes fondeados.
- Migración retroactiva de cálculo de fechas para negocios pre-existentes (sólo backfill `numAportes`).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `negocios`: número de aportes calculado y persistido; renombrado de "anualidades" a "aportes"; cálculo y persistencia de fechas esperadas; permisos de fondeo refinados por rol.

## Approach

1. **Schema**: agregar `Business.numAportes Int?`; renombrar modelo `AnnualPayment` → `Payment` (`@@map("payments")`); agregar `expectedDate DateTime?`. Migración con `RENAME TABLE`.
2. **Cálculo numAportes**: helper puro `calculateNumAportes(term, periodicidad, company, product)` con multiplicadores y excepciones (Pago único / Aportes ocasionales = 1; SKANDIA+MFUND = 0).
3. **Cálculo fechas**: helper `calculateExpectedDates(firstDate, numAportes, periodicidad)` usando `date-fns` con `addMonths` (maneja end-of-month correctamente). Persistir las N fechas en transacción al primer fondeo.
4. **UI**: form section reactivo (recalcula al cambiar plazo/periodicidad/empresa/producto); `FundingModal` con sección colapsada "Fondeados" + lista expandida "Pendientes".
5. **Permisos**: helper `canFundPayments(role)` separado del de visibilidad. AGENTE pasa visibilidad pero falla en acción.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Renombrar modelo, añadir `numAportes`, `expectedDate` |
| `src/features/negocios/lib/business-form-schemas.ts` | Modified | Validación con `numAportes` |
| `src/features/negocios/components/sections/business-info-section.tsx` | Modified | Campo read-only Número de Aportes |
| `src/features/negocios/actions/create-business.ts` | Modified | Persistir `numAportes` |
| `src/features/negocios/components/modals/AnnualFundingModal.tsx` | Modified | Renombrar → `FundingModal`; UI compacta; scroll |
| `src/app/api/negocios/[id]/annual-payments/route.ts` | Modified | Renombrar a `/payments`; incluir `expectedDate` |
| `src/app/api/negocios/[id]/fondear-anualidades/route.ts` | Modified | Calcular y persistir fechas en primer aporte |
| `src/features/auth/lib/roles.ts` | Modified | `FUND_PAYMENT_ALLOWED_ROLES` excluye AGENTE |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rename de tabla rompe queries existentes | High | Migración Prisma con `@@map` + búsqueda completa de referencias |
| End-of-month en cálculo de fechas (31 ene → 28/29 feb) | Med | `date-fns/addMonths` ya lo maneja; tests unitarios con leap years |
| Negocios legacy sin `numAportes` | Med | Backfill SQL en migración + `Int?` nullable |
| Atomicidad de cálculo + persistencia | Med | Transacción Prisma envolviendo INSERT de N fechas + UPDATE estado |
| Coach actualmente ve botón de fondeo | Low | Separar capability `canView` de `canFund` con tests |

## Rollback Plan

1. Revertir migración Prisma con `migrate resolve --rolled-back` + `RENAME TABLE payments TO anual_payment`.
2. Revertir feature flag `ENABLE_PAYMENTS_V2` (si aplica) o revert de PR completo.
3. Las columnas nuevas (`numAportes`, `expectedDate`) son nullable: rollback no destruye datos.

## Dependencies

- `date-fns` (ya instalado).
- Prisma migration window coordinado con equipo (rename de tabla).

## Success Criteria

- [ ] Crear negocio Mensual con plazo 5 → `numAportes = 60` persistido y visible.
- [ ] SKANDIA+MFUND → `numAportes = 0`, botón fondear directo.
- [ ] Pago único → `numAportes = 1`, botón fondear directo.
- [ ] Primer fondeo Mensual con fecha 31-ene-2025 calcula correctamente 28-feb, 31-mar, 30-abr…
- [ ] Coach (AGENTE) ve modal de aportes en read-only sin botón fondear.
- [ ] Admin y Asistente Operativo pueden fondear aportes desde el modal.
- [ ] Aportes fondeados se renderizan en sección compacta scrollable.
