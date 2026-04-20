# Proposal: H5 — Reporte Excel (negocios / comisiones)

## Intent

Habilitar descarga Excel para **asistente operativo**, **admin** y **analista de soporte**, con filtros por **fecha de fondeo** (`business.date_anchored`), estado y columnas para cálculo de comisiones (jerarquía, anualidades), según PRD `financieramente-reporte-negocios-prd.md` §2.2 H5 y §4.4.

## Scope

### In Scope

- Route handler que genere `.xlsx` en servidor (patrón `src/app/api/pre-liquidacion/exportar/[fileId]/route.ts`).
- Query params / body: `dateFrom`, `dateTo` aplicados a **`date_anchored`** del negocio; intervalo **[inicio, fin]** inclusivo en **día civil Colombia** (`America/Bogotá`).
- Filtro opcional por estado alineado al PRD cuando el modelo lo permita (`LIQUIDADO`, etc.).
- **Una sola fuente de verdad** para `WHERE`: helper compartido entre listado y export.
- Columnas: negocio, cliente, producto, compañía, valor, plazo, periodicidad/indicador anualidad, coach + categoría, **cadena de líderes** (nombre + categoría por nivel), origen; columnas dinámicas **`Fecha fondeo anualidad 1…n`**.
- UI: rango fechas + botón export; visible solo para `ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`, `ANALISTA_SOPORTE`.

### Out of Scope

- Import masiva de fondeos por Excel (PRD §2.3).
- Colas/async download salvo evidencia de fallo de SLA en staging.
- Definición final lista PII mínima (§4.5) — documentar placeholder.

## Approach

Extraer `buildBusinessListWhere(currentUser, filters)` desde `GET /api/negocios`; extender filtros en Zod (`business-api.schemas.ts`). Nuevo **`POST`** (o `GET` acotado) export que reutilice el mismo `where`, `findMany` sin paginación con **tope** documentado, includes de **`annualPayments`** ordenadas por `installment_index`. Cadena de líderes: extender/reciclar `buildUplineChain` con nombres + categoría, **caché por `idUser`** en el batch. Generar filas + cabeceras dinámicas hasta el máximo `term`/`n` del resultado. Librería TZ explícita para límites de día.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/negocios/route.ts` | Modified | Usar helper `where`; nuevos params fecha |
| `src/features/negocios/lib/business-api.schemas.ts` | Modified | Fechas + estados PRD |
| `src/app/api/negocios/export/route.ts` | New | Auth por rol, buffer `xlsx` |
| `src/features/negocios/components/*` | Modified | Filtros fecha, export |
| `src/features/pre-liquidacion/lib/resolve-beneficiary.ts` | Reference | Patrón cadena; posible módulo negocios |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Desfase TZ Colombia vs UTC | Med | Tests con instantes fijos; regla única en código |
| N+1 al resolver líderes | Med | Caché por usuario en una pasada |
| `LIQUIDADO` no en filtros aún | Med | Alinear migración estados o feature flag filtro |

## Rollback Plan

Revertir commit: eliminar route export y UI; restaurar `route.ts` si el refactor rompe listado. Sin cambios destructivos en DB en este cambio si solo API/UI.

## Dependencies

- Migración / tipos **`COMISIONANDO` → `LIQUIDADO`** y UI de estados (PRD §5) idealmente coordinados con filtros de export.

## Success Criteria

- [ ] Solo roles H5 pueden exportar; otros reciben 403.
- [ ] Rango fecha filtra solo por `business.date_anchored`; `null` excluido del rango.
- [ ] Mismos filtros → mismas filas que listado (validación manual o test de contrato query).
- [ ] Excel incluye columnas anualidad dinámicas cuando hay periodicidad Anual.
- [ ] Referencia K4: export &lt; 30 s hasta ~5 000 filas en entorno acordado.
