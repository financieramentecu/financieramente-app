# QA Strategy: Load File V2

## Contexto

Este documento describe la estrategia de pruebas para el flujo `load-file-v2` (`refactor-load-file-v2`), que implementa el motor de reglas para la carga y sincronización de archivos de comisiones (Voluntaria y Póliza).

**Archivos de prueba:** `docs/test-data/`
**Tests unitarios:** `src/features/load-file/__tests__/process-batch.service.test.ts`
**Spec:** `openspec/changes/refactor-load-file-v2/specs/load-file-v2/spec.md`

---

## 1. Mapa de Archivos CSV → Escenarios

| Archivo | Escenario que prueba | Resultado esperado |
|---|---|---|
| `voluntaria-synchronized.csv` | Negocio existe, fecha en mes actual (Feb 2026) | Todos → `SYNCHRONIZED` |
| `voluntaria-lagged.csv` | Negocio existe, fecha en mes pasado (Ene 2025) | Todos → `LAG` (`rezagado`) |
| `voluntaria-mixed.csv` | Mix SYNC + LAG + error de formato + contrato inexistente | Combinación de estados |
| `voluntaria-errors.csv` | Filas con campos vacíos/inválidos | → `FileImportError` |
| `poliza-synchronized.csv` | Póliza normal con Plan A, negocios existentes | Todos → `SYNCHRONIZED` |
| `poliza-lagged.csv` | Póliza sin negocio registrado en BD | Todos → `LAG` (`noSincronizado`) |
| `poliza-mixed.csv` | Mix con filas que tienen campos vacíos | Válidos → SYNC, vacíos → `FileImportError` |
| `poliza-errors.csv` | Filas con campos críticos vacíos (Plan, Valor) | → `FileImportError` |

---

## 2. Análisis de Gaps en Tests Existentes

Los tests en `process-batch.service.test.ts` cubren las tareas 4.1–4.4 del plan, pero los siguientes escenarios **no están cubiertos**:

### Voluntaria (faltantes)

| Escenario | Task | Estado |
|---|---|---|
| Negocio NO existe → LAG + `noSincronizado++` | 4.3 | ❌ Falta |
| Negocio existe, 0 comisiones previas, fecha DENTRO del mes → `SYNCHRONIZED` | 4.2 | ❌ Falta |
| Negocio existe, LAG previo → actualiza LAG antiguo + crea nuevo SYNC + `recoveredLags++` | 4.2 | ❌ Falta |
| Campo vacío/formato inválido → `FileImportError` + `errorRecord++` | 4.5 | ❌ Falta |

### Póliza (faltantes)

| Escenario | Task | Estado |
|---|---|---|
| CLAW verifica `discountPercentage = 0` y `clawbackPercentage = 0` explícitamente | 4.4 | ❌ Parcial (solo verifica `isClawback`) |
| Plan sin CLAW/FRONT19 → `isClawback = false`, usa config global | 4.4 | ❌ Falta |

### Integridad General

| Escenario | Task | Estado |
|---|---|---|
| `SettlementCommission` nunca guarda `status = 'ERROR'` | 4.6 | ❌ Falta |

---

## 3. Tests Unitarios a Implementar

Agregar estos casos en `process-batch.service.test.ts`:

```typescript
// --- Voluntaria ---

it('should create LAG and increment noSincronizado when Voluntaria business not found')
// findBusinessByContract → null
// expect: settlementCommission.create({ status: 'LAG', isLag: true, idBusiness: null/undefined })
// expect: result.summary.noSincronizado === 1

it('should create SYNCHRONIZED when business found, 0 prior commissions, date inside month')
// findBusinessByContract → { idBusiness: X, createdAt: same month as record.Desde }
// settlementCommission.findMany → []
// expect: settlementCommission.create({ status: 'SYNCHRONIZED', isLag: false })
// expect: result.summary.sincronizado === 1

it('should recover LAG and create new SYNC for Voluntaria, incrementing recoveredLags')
// findBusinessByContract → { idBusiness: X }
// settlementCommission.findMany → [{ idSettlementCommission: 500, isLag: true }]
// expect: settlementCommission.update({ where: { id: 500 }, data: { status: 'SYNCHRONIZED', isLag: false } })
// expect: settlementCommission.create({ status: 'SYNCHRONIZED', isLag: false })
// expect: result.summary.sincronizado === 2

it('should log FileImportError and increment error for invalid Voluntaria row format')
// record with missing Base field
// expect: settlementCommission.create NOT called
// expect: fileImportError.create called with reason describing the format error
// expect: result.summary.error === 1

// --- Póliza ---

it('should set discountPercentage=0, clawbackPercentage=0, isClawback=true for CLAW plan')
// Plan de Compensación contains 'CLAW'
// expect: settlementCommission.create({
//   isClawback: true, discountPercentage: 0, clawbackPercentage: 0
// })

it('should use global config percentages for Poliza plan without CLAW or FRONT19')
// Plan de Compensación = 'Plan Regular'
// activeConfig: { discountPercentage: 12, clawbackPercentage: 10 }
// expect: settlementCommission.create({ isClawback: false, discountPercentage: 12 })

// --- Integridad ---

it('should never save SettlementCommission with status ERROR')
// Run all scenarios and assert no call to settlementCommission.create({ data: { status: 'ERROR' } })
```

---

## 4. Matriz de Prueba Manual (UI / E2E)

### Pre-condiciones de BD requeridas

Antes de cada prueba, la BD debe tener:
- **Negocios (Business):** contratos `CTO-2001` a `CTO-2010` para Voluntaria, `CONT-1001` a `CONT-1010` para Póliza.
- **Config activa:** registro en `CommissionConfiguration` con `status = 'ACTIVE'`.
- **Para LAG recovery:** pre-crear `SettlementCommission` con `isLag = true` para los mismos contratos.

### Casos de prueba E2E

| # | Archivo | Pre-condición BD | Verificar en resumen | Verificar en BD |
|---|---|---|---|---|
| 1 | `voluntaria-synchronized.csv` | Negocios CTO-2001..2010 existen, `createdAt` en Feb 2026 | `sincronizado=10, rezagado=0, error=0` | `status='SYNCHRONIZED', isLag=false` en todos |
| 2 | `voluntaria-lagged.csv` | Negocios existen, `createdAt` en Feb 2026, registros con fecha Ene 2025 | `rezagado=10` | `status='LAG', isLag=true, idBusiness != null` |
| 3 | `voluntaria-lagged.csv` | Sin negocios en BD | `noSincronizado=10` | `status='LAG', isLag=true, idBusiness = null` |
| 4 | LAG recovery: subir `lagged` → luego `synchronized` | Negocios existen | 2da carga: `sincronizado=10, recoveredLags=10` | LAGs anteriores → `isLag=false` |
| 5 | `voluntaria-errors.csv` | - | `error=N` | Registros en `FileImportError` con campo `reason` |
| 6 | `voluntaria-mixed.csv` | Negocios parciales (CTO-2001..2008 existen, CTO-9999 no) | Mix de estados | Verificar cada contrato individualmente |
| 7 | `poliza-synchronized.csv` | Negocios CONT-1001..1010 existen | `sincronizado=10` | `status='SYNCHRONIZED', originCommission` según Plan |
| 8 | `poliza-lagged.csv` | Sin negocios en BD | `noSincronizado=10` | `status='LAG', isLag=true` |
| 9 | `poliza-errors.csv` | - | `error=N` | Registros en `FileImportError` |
| 10 | Póliza con plan FRONT19 | Negocio existe | `sincronizado=1` | `originCommission='CARTERA', isClawback=false` |
| 11 | Póliza con plan CLAW | Negocio existe | `sincronizado=1` | `isClawback=true, discountPercentage=0, clawbackPercentage=0` |

---

## 5. Verificaciones en BD Post-Carga

```sql
-- Distribución de estados por carga
SELECT status, is_lag, COUNT(*)
FROM settlement_commission
WHERE id_file_import = <id>
GROUP BY status, is_lag;

-- Errores registrados
SELECT row_number, reason, raw_data
FROM file_import_error
WHERE id_file_import = <id>
ORDER BY row_number;

-- Verificar que NUNCA existe status ERROR en settlement_commission (task 4.6)
SELECT COUNT(*) FROM settlement_commission WHERE status = 'ERROR';
-- Resultado esperado: 0

-- Verificar LAG recovery: LAGs anteriores actualizados a SYNC
SELECT id_settlement_commission, status, is_lag, lag_date
FROM settlement_commission
WHERE contract IN ('CTO-2001', 'CTO-2002')
ORDER BY created_at;

-- Verificar config aplicada correctamente
SELECT contract, discount_percentage, clawback_percentage, is_clawback
FROM settlement_commission
WHERE id_file_import = <id>;
```

---

## 6. Verificación del Endpoint de Errores

El task 3.6 crea `GET /api/carga-archivos/:id/errors`. Validar:

```bash
# Debe retornar lista de FileImportError para el fileImport dado
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/carga-archivos/<fileImportId>/errors

# Respuesta esperada:
# [{ rowNumber, contract, reason, rawData }, ...]
```

---

## 7. Orden de Ejecución Recomendado

```bash
# 1. Baseline actual
npx vitest run src/features/load-file

# 2. Verificar cobertura de ramas
npx vitest run --coverage src/features/load-file

# 3. Implementar tests faltantes y re-ejecutar
npx vitest run src/features/load-file

# 4. Type checking
npm run type-check

# 5. Pruebas manuales con CSVs en orden:
#    synchronized → lagged (sin negocio) → lagged (con negocio) → LAG recovery → mixed → errors

# 6. Validar en BD con las queries de la sección 5
```

---

## 8. Criterios de Aceptación

- [ ] Todos los unit tests pasan sin errores
- [ ] Cobertura de ramas > 80% en `voluntaria.processor.ts` y `poliza.processor.ts`
- [ ] `SettlementCommission` nunca contiene `status = 'ERROR'`
- [ ] Cada CSV produce exactamente los conteos esperados en el resumen
- [ ] `FileImportError` registra correctamente cada fila inválida con `rowNumber`, `reason` y `rawData`
- [ ] LAG recovery actualiza el registro anterior y crea uno nuevo en la misma transacción
- [ ] CLAW siempre fuerza `discountPercentage = 0` y `clawbackPercentage = 0` independiente de la config global
- [ ] FRONT19 siempre asigna `originCommission = 'CARTERA'`
- [ ] El endpoint `GET /api/carga-archivos/:id/errors` retorna la lista correcta
