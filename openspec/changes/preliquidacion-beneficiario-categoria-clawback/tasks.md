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

## Phase 8: Admin categorías — tipos y esquemas

- [x] 8.1 `src/features/categories/types/category.types.ts`: agregar `beneficiaryMode: 'UPLINE_CHAIN' | 'FIXED_BENEFICIARY'`, `idFixedBeneficiaryUser: number | null`, `fixedBeneficiaryUser?: { idUser: number; name: string; email: string } | null`. Agregar constante `SYSTEM_CATEGORY_TYPE_NAME = 'SISTEMA'`.
- [x] 8.2 `src/features/categories/lib/category-schemas.ts`: agregar `beneficiaryMode` (enum, default `UPLINE_CHAIN`) e `idFixedBeneficiaryUser` (nullable number) a `createCategorySchema` y `updateCategorySchema` + `.superRefine()` → error si `FIXED_BENEFICIARY` y FK es null.
- [x] 8.3 `src/features/categories/mappers/category.mapper.ts`: mapear `beneficiaryMode`, `idFixedBeneficiaryUser` y relación opcional `fixedBeneficiaryUser` (name + email) desde Prisma al tipo dominio.

## Phase 9: Admin categorías — API routes

- [x] 9.1 `src/app/api/categories/[id]/route.ts` — GET: `include: { fixedBeneficiaryUser: { select: { idUser, name, lastName, email } } }` y pasar al mapper. PUT: aceptar `beneficiaryMode` + `idFixedBeneficiaryUser`; validar invariante `FIXED_BENEFICIARY ⇒ non-null user` antes de persistir (retornar 400 si falla).
- [x] 9.2 `src/app/api/categories/route.ts` — POST: aceptar `beneficiaryMode` + `idFixedBeneficiaryUser`; aplicar misma validación antes de crear.

## Phase 10: Admin categorías — UI

- [x] 10.1 `src/features/categories/components/category-form.tsx`: agregar `<Select>` para `beneficiaryMode` (opciones `UPLINE_CHAIN` | `FIXED_BENEFICIARY`). Cuando `FIXED_BENEFICIARY`, mostrar selector de usuario activo (consumir `/api/admin/users` o endpoint disponible). Conectar al `zodResolver` actualizado.
- [x] 10.2 En `category-form.tsx`: cuando `Category.typeCategory === SYSTEM_CATEGORY_TYPE_NAME` y `beneficiaryMode === FIXED_BENEFICIARY`, mostrar nombre + email del `fixedBeneficiaryUser` como campos read-only (no editables). Cuando no hay usuario configurado, mostrar placeholder.

## Phase 11: Tests admin categorías

- [x] 11.1 `src/features/categories/__tests__/lib/category-schemas.test.ts`: escenarios spec — `FIXED_BENEFICIARY` sin FK → error validación; `UPLINE_CHAIN` sin FK → válido; `FIXED_BENEFICIARY` con FK válido → válido.
- [x] 11.2 `src/features/categories/__tests__/mappers/category.mapper.test.ts`: nuevos campos mapeados correctamente; `fixedBeneficiaryUser` null cuando no hay relación.
- [x] 11.3 `src/features/categories/__tests__/components/category-form.test.tsx`: selector de modo visible; picker de usuario aparece solo con `FIXED_BENEFICIARY`; display read-only para tipo SISTEMA.

## Phase 12: Avance parcial del file y reporte de errores — servicio

- [x] 12.1 En `pre-liquidacion.service.ts` (`procesarPreLiquidacion`): acumular errores de configuración en `registrosConError: { idSettlementCommission: number; categoryCode: string; errorCode: string }[]` durante el loop — agregar entrada cuando `resolveBeneficiaryUserId` retorna `{ ok: false }`.
- [x] 12.2 En `procesarPreLiquidacion`: reemplazar el `prisma.fileImport.update({ status: 'PRE-SETTLED' })` incondicional (línea ~1151) por una verificación post-loop: contar `settlementCommission` con `status: 'SYNCHRONIZED'` para ese `fileImportId`; avanzar el file **solo si el conteo es 0**.
- [x] 12.3 Actualizar el tipo de retorno de `procesarPreLiquidacion` en `src/features/pre-liquidacion/types/types.ts`: agregar `registrosConError: { idSettlementCommission: number; categoryCode: string; errorCode: string }[]` a la respuesta existente (no breaking — campo nuevo).

## Phase 13: Modal de errores — UI

- [x] 13.1 Crear `src/features/pre-liquidacion/components/ModalErroresConfiguracion.tsx`: modal dismissible (usar `Dialog` de Shadcn/UI) que recibe `registrosConError[]` y los lista en una tabla simple (ID settlement, categoría, motivo del error en español). Solo se monta cuando `registrosConError.length > 0`.
- [x] 13.2 En el componente/página que invoca preliquidación (`src/features/pre-liquidacion/` o `src/app/dashboard/pre-liquidacion/`): leer `registrosConError` de la respuesta; controlar visibilidad del modal con estado local; mostrar el modal si la lista no está vacía.

## Phase 14: Tests avance parcial y modal

- [x] 14.1 `pre-liquidacion.service.test.ts`: caso mixto — algunos registros exitosos y uno con error de config → los exitosos son PRE-SETTLED, el fallido queda SYNCHRONIZED, `FileImport.update` NO es llamado con `PRE-SETTLED`; `registrosConError` tiene una entrada con `categoryCode` y `errorCode` correctos.
- [x] 14.2 `pre-liquidacion.service.test.ts`: todos exitosos → `FileImport.update` llamado con `PRE-SETTLED`; `registrosConError` vacío.
- [x] 14.3 `ModalErroresConfiguracion.test.tsx`: modal se muestra con la lista correcta; botón cerrar oculta el modal; no se renderiza si la lista está vacía.

## Phase 15: Origin change validation guard

- [x] 15.1 `src/features/negocios/services/product-configuration.service.ts`: agregar función `validateProductConfigurationExists(idCategory: number, idProduct: number, idClientOrigin: number): Promise<boolean>` — retorna `true` si existe un `ProductConfiguration` activo para esa combinación, `false` si no.
- [x] 15.2 `src/app/api/negocios/[id]/route.ts` — PUT, rama `idClientOrigin`: antes de llamar `recalcularComisionesPorCambioOrigen`, obtener el negocio con `include: { productConfiguration: { include: { product: true } } }` (o equivalente para leer `idProduct` e `idCategory`). Llamar `validateProductConfigurationExists`. Si retorna `false` → `return NextResponse.json({ data: null, error: 'No existe configuración de producto para la combinación categoría/producto/nuevo origen' }, { status: 400 })`.
- [x] 15.3 `src/features/negocios/components/modals/BusinessViewModal.tsx`: al recibir error 400 del PUT (cambio de origen), mostrar toast de error con el mensaje del API en lugar de fallar silenciosamente.

## Phase 16: Tests origin change validation

- [x] 16.1 `src/features/negocios/services/__tests__/product-configuration.service.test.ts`: `validateProductConfigurationExists` retorna `false` cuando no hay config; retorna `true` cuando existe; usa `prisma.productConfiguration.findUnique` con la clave compuesta correcta.
- [x] 16.2 `src/app/api/negocios/[id]/__tests__/route.test.ts` (o equivalente): PUT con `idClientOrigin` válido pero sin `ProductConfiguration` → 400 con mensaje claro; con config válida → llama `recalcularComisionesPorCambioOrigen` y retorna 200.
- [x] 16.3 `BusinessViewModal.test.tsx`: PUT de origen con error 400 → toast de error visible con el mensaje del API; sin error → no muestra toast de error.
