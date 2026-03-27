# Tasks: Pre-liquidation beneficiary per category and clawback alignment

## Phase 1: Schema and migration

- [x] 1.1 Finalizar `prisma/schema.prisma`: enum `BeneficiaryMode`; `Category.beneficiaryMode`, `Category.idFixedBeneficiaryUser` → `User`; `ComissionDistribution.idBeneficiaryUser` NOT NULL + relación inversa en `User`.
- [x] 1.2 Migración: columnas nuevas; default `UPLINE_CHAIN`; backfill `id_beneficiary_user` vía `settlement_commission` → `business` → `user`; NOT NULL y FK en `comission_distribution`.
- [x] 1.3 (Opcional) CHECK en PostgreSQL: `FIXED_BENEFICIARY` implica `id_fixed_beneficiary_user IS NOT NULL`.

## Phase 2: Resolver (lib pura)

- [x] 2.1 Crear `src/features/pre-liquidacion/lib/resolve-beneficiary.ts`: `buildUplineChain` (tope de profundidad, detección de ciclo vía `user.findUnique` + `leader`), `resolveBeneficiaryUserId` → `ResolveBeneficiaryResult` como en design.
- [x] 2.2 Reglas: `UPLINE_CHAIN` ignora `idFixedBeneficiaryUser`; primer match en cadena `[agente, líder, …]` con `idCategoria` igual a la categoría; `FIXED_BENEFICIARY` exige usuario fijo activo (códigos `FIXED_MISSING_USER`, `UPLINE_NO_MATCH`, `FIXED_USER_INACTIVE`).

## Phase 3: Servicio pre-liquidación

- [x] 3.1 En `pre-liquidacion.service.ts` (`procesarPreLiquidacion`): cargar PPC con `include: { category: true }`; armar cadena; resolver por fila; si alguna falla, no escribir distribuciones ni clawbacks ni PRE-SETTLED; log con categoría/código; opcional `registrosOmitidos` y sufijo en `mensaje`.
- [x] 3.2 En el `$transaction` de éxito: `create` de `ComissionDistribution` con `idBeneficiaryUser`; al crear `Clawback`, `idUser` = mismo `idBeneficiaryUser` de esa fila.
- [x] 3.3 En `recalcularComisionesPorCambioOrigen`: reutilizar resolver y persistir `idBeneficiaryUser` / `Clawback.idUser` con las mismas reglas al recrear distribuciones.

## Phase 4: API lectura y tipos

- [x] 4.1 `obtenerDistribucionComision`: `include` del beneficiario (`User`: nombre/apellido) y mapeo a ítems.
- [x] 4.2 Actualizar `src/features/pre-liquidacion/types/types.ts` y `src/app/api/pre-liquidacion/distribucion/[settlementCommissionId]/route.ts` (+ Zod de respuesta si aplica).

## Phase 5: UI

- [x] 5.1 `ModalDetalleDistribucion.tsx`: columna o campo de beneficiario por línea usando datos del API.

## Phase 6: Seeds y entorno

- [x] 6.1 `prisma/seeds/user.ts`: usuario sistema Agencia (`agencia@financieramentecu.com`) si falta.
- [x] 6.2 `prisma/seeds/category.ts`: tras usuarios, `AGENCIA` → `FIXED_BENEFICIARY` + `idFixedBeneficiaryUser`; demás `UPLINE_CHAIN` y FK fijo null.
- [x] 6.3 `.env.example`: `AGENCIA_USER_PASSWORD` (opcional) documentado.

## Phase 7: Pruebas

- [x] 7.1 `src/features/pre-liquidacion/lib/__tests__/resolve-beneficiary.test.ts`: escenarios spec — fixed válido; upline acierto (primer match); upline sin match; fixed null/ inválido; usuario fijo inactivo; ciclo; profundidad máxima.
- [x] 7.2 `pre-liquidacion.service.test.ts` (y/o tests de proceso): registro bloqueado → sin `comissionDistribution.create`, sin PRE-SETTLED, sin clawback; éxito → `idBeneficiaryUser` y `Clawback.idUser` alineados (spec “Clawback aligns with row beneficiary”).
- [x] 7.3 Ajustar `recalcularComisionesPorCambioOrigen.test.ts` mocks/includes si el recalc pasa a exigir `category` en PPC.
- [x] 7.4 `distribucion/[settlementCommissionId]/__tests__/route.test.ts`: respuesta incluye campos de beneficiario por línea (spec “API includes beneficiary for UI”).
