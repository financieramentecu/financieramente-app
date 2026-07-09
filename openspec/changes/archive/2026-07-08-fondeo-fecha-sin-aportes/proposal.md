# Proposal: Fecha de fondeo seleccionable para negocios sin aportes

## Intent

Negocios sin aportes (`numAportes=0`, ej. MFUND de Skandia con modalidad única) hoy se fondean con un `AlertDialog` de confirmación simple que fuerza `dateAnchored = new Date()` (hoy). El fondeo real suele ocurrir en una fecha anterior a su registro en el sistema, generando desincronización entre la fecha contable del aporte y la registrada. Este cambio permite a los roles operativos seleccionar la fecha real del aporte al fondear.

## Scope

### In Scope
- Reemplazar el `AlertDialog` de confirmación por un modal con selector de fecha para negocios sin aportes.
- Aceptar `fundedDate` (YYYY-MM-DD) en `POST /api/negocios/[id]/fondear`, convertida con `dateOnlyToBogotaNoonUtc()`.
- Validación de body con Zod; fallback a hoy (Bogotá) si no se envía fecha.
- Registrar la fecha elegida en `AuditLog` (`BUSINESS_FUNDED`).
- Habilitar la acción para Admin, Analista de Soporte y Asistente Operativo de Gerencia (via `canFundPayments`).

### Out of Scope
- Flujo de aportes/anualidades (`fondear-aportes`) — ya soporta `fundedDate`.
- Edición de la fecha de fondeo después de fondear (no hay des-fondeo).
- Validaciones de negocio sobre rango de fechas (futuro/pasado extremo).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `negocio-funding`: el fondeo directo (sin aportes) acepta una fecha de fondeo provista por el operador en lugar de forzar la fecha actual.

## Approach

Reutilizar `FundedDatePickerDialog` (modal date-picker ya existente) en lugar del `AlertDialog`. En el page client, cuando `!hasPayments`, abrir el date-picker; al confirmar, pasar la fecha al hook de fondeo directo. Extender el endpoint `/fondear` para parsear `fundedDate` con Zod y usar `dateOnlyToBogotaNoonUtc()` — mismo patrón ya probado en `fondear-aportes`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/negocios/[id]/fondear/route.ts` | Modified | Parsear `fundedDate`, anclar con `dateOnlyToBogotaNoonUtc()` |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modified | Sustituir AlertDialog por date-picker para `!hasPayments` |
| `src/features/negocios/hooks/*` (fondeo directo) | Modified | Propagar `fundedDate` al request |
| `src/features/negocios/components/modals/FundedDatePickerDialog.tsx` | Reused | Sin cambios o subtítulo configurable |
| `src/features/negocios/lib/*.schema.ts` | New/Modified | Schema Zod para body de `/fondear` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Desfase de día por timezone | Med | Usar `dateOnlyToBogotaNoonUtc()` siempre |
| Rol sin permiso ve el botón | Low | Reusar gate `canFundPayments` en UI y API |
| Regresión en flujo con aportes | Low | Cambio aislado al branch `!hasPayments` |

## Rollback Plan

Cambio aditivo y localizado. Revertir el commit restaura el `AlertDialog` y `dateAnchored = new Date()`. Sin migraciones de BD ni cambios de schema Prisma, por lo que el rollback es limpio y sin estado residual.

## Dependencies

- Ninguna externa. Reutiliza `FundedDatePickerDialog`, `dateOnlyToBogotaNoonUtc()` y `canFundPayments` existentes.

## Success Criteria

- [ ] Al fondear un negocio sin aportes se abre un modal con selector de fecha (default hoy Bogotá).
- [ ] `dateAnchored` persiste la fecha elegida (noon Bogotá UTC), no la del servidor.
- [ ] Solo Admin, Analista de Soporte y Asistente Operativo de Gerencia acceden a la acción.
- [ ] `AuditLog` registra la fecha seleccionada.
- [ ] Tests de ruta y hook cubren fecha provista y fallback a hoy.
