# Proposal: PPC global por defecto en creación de negocio

## Intent

Permitir que el usuario cree negocios aunque no exista configuración específica por producto, origen y categoría. Hoy la creación falla por validación estricta de distribución, lo que bloquea operación.

## Scope

### In Scope
- Resolver un `ProductPercentageCommission` (PPC) activo por defecto global.
- Usar ese PPC como fallback en creación de negocio cuando no haya match específico.
- Mantener prioridad del PPC específico cuando sí exista.
- Ajustar pruebas unitarias del flujo de resolución de PPC y creación.

### Out of Scope
- Cambios de modelo de datos en `Business` o nullable de `idProductPercentageCommission`.
- Reglas avanzadas de priorización por producto/origen/categoría para el fallback.
- Reprocesamiento histórico de negocios ya creados.

## Approach

Se extenderá la resolución de PPC para nuevos negocios: primero buscar configuración específica (`idProduct`, `idClientOrigin`, `idCategory`), y si no hay PPC utilizable, tomar un PPC global activo con categorías activas. La action de creación consumirá ese resultado sin bloquear al usuario.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/negocios/services/product-configuration.service.ts` | Modified | Resolver fallback global de PPC |
| `src/features/negocios/actions/find-product-percentage-commission.ts` | Modified | Priorizar retorno de PPC (específico o fallback) |
| `src/features/negocios/actions/create-business.ts` | Modified | Consumir resolución sin bloqueo por ausencia específica |
| `src/features/negocios/__tests__/actions/create-business.test.ts` | Modified | Escenarios de fallback y prioridad |
| `src/features/negocios/__tests__/services/product-configuration.service.test.ts` | Modified | Casos de lookup específico y fallback |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Asignación de comisión no ideal para ciertos negocios | Med | Orden determinístico y auditoría de asignación |
| Impacto en cálculos posteriores por configuración genérica | Med | Requerir PPC activo con categorías activas |
| Ambigüedad entre varios PPC elegibles | Low | Selección estable por criterio explícito |

## Rollback Plan

Revertir cambios en servicio/action de resolución PPC y restaurar validación estricta actual. Validar con pruebas de `negocios` que vuelva el bloqueo por falta de configuración específica.

## Dependencies

- Existencia de al menos un PPC activo elegible para fallback.

## Success Criteria

- [ ] Se puede crear negocio sin configuración específica producto/origen/categoría.
- [ ] Si existe PPC específico, se usa antes que el global.
- [ ] Si no existe ningún PPC elegible, se retorna error controlado.
- [ ] Pruebas unitarias cubren prioridad específica y fallback global.
