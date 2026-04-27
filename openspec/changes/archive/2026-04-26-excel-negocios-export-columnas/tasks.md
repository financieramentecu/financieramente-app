# Tasks: Excel negocios — orden y encabezados

## Phase 1: Mapper (columnas, claves, dinámicas)

- [x] 1.1 En `src/features/negocios/lib/map-business-to-export-row.ts`, exportar `NEGOCIOS_EXPORT_VALOR_COLUMN = 'Valor de Negocio'`.
- [x] 1.2 Actualizar `negociosExportColumnHeaders`: bloque base en orden/spelling del delta spec (ítems Agente … Fecha de Fondeo); prefijo opcional Fecha inicial/final fondeo sin cambios de semántica.
- [x] 1.3 Tras Fecha de Fondeo en headers: columnas **Líder N nombre/categoría** solo para N≥2 (maxLeaderLevels); antes estaban mezcladas — mover bloque después de fecha fondeo.
- [x] 1.4 Cabeceras anualidades: `Fecha Fondeo Anualidad ${i}` para i = 1..maxAnnualCols.
- [x] 1.5 Actualizar `mapBusinessToExportRow`: mismas claves que headers; asignar campos base en nuevo orden; escribir líder 1 en **Líder Encargado** / **Categoría Líder**; mover bucle líderes i≥2 después de valores de Fecha de Creación/Emisión/Fondeo; mantener lógica anualidades con nuevas keys.

## Phase 2: API route (formato moneda)

- [x] 2.1 En `src/app/api/negocios/export/route.ts`, importar `NEGOCIOS_EXPORT_VALOR_COLUMN` y usarlo en lugar del literal `'Valor negocio'` para `indexOf` / formato `$#,##0.00`.

## Phase 3: Tests y verificación

- [x] 3.1 Actualizar `src/features/negocios/lib/__tests__/map-business-to-export-row.test.ts`: orden índices, nombres columnas, keys en `mapBusinessToExportRow` (casos sin fecha y con `dateFrom`/`dateTo`).
- [x] 3.2 Revisar `src/app/api/negocios/export/__tests__/route.test.ts`; ajustar solo si asume nombres de cabecera antiguos.
- [x] 3.3 Ejecutar `pnpm vitest` (o comando del proyecto) para tests de export/mapper tocados.
- [ ] 3.4 Opcional: descarga manual Excel (admin) con y sin rango de fondeo; validar orden y etiquetas vs delta spec.

## Phase 4: Post-implementación SDD

- [x] 4.1 Tras merge de código: **`sdd-verify`** contra escenarios del delta `specs/negocios/spec.md`.
- [x] 4.2 Cuando esté listo: **`sdd-archive`** para fusionar delta en `openspec/specs/negocios/spec.md`.
