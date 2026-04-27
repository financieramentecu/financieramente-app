# Proposal: Excel negocios — orden y encabezados (admin / operación / analista)

## Intent

El export `POST /api/negocios/export` debe reflejar el orden de columnas y los nombres que operación espera para análisis y comunicación con cliente. Hoy la spec y el código fijan un orden distinto (p. ej. periodicidad antes de producto, origen antes de correo/teléfono, fechas emisión/fondeo/creación en otro orden). Se alinea inventario visible sin cambiar filtros ni volumen máximo.

## Orden canónico de columnas (Excel)

Orden **de izquierda a derecha**. Los literales deben coincidir exactamente con las cabeceras generadas (incluye tildes: **Compañía**, **Categoría Líder**).

### Con filtro de rango de fondeo (`dateFrom` y `dateTo` presentes)

Se anteponen solo en este caso:

1. Fecha inicial fondeo  
2. Fecha final fondeo  

A continuación, el bloque común:

3. Agente  
4. Nombres y Apellidos del Cliente  
5. Número de Cédula *(antes: Cedula del cliente)*  
6. Correo Electrónico *(antes: Email Cliente)*  
7. Teléfono *(antes: Celular)*  
8. Origen del cliente  
9. Compañía  
10. Plazo  
11. Producto  
12. Número de Contrato *(antes: Número de contrato)*  
13. Moneda  
14. Valor de Negocio *(antes: Valor negocio)*  
15. Periodicidad del pago *(antes: Periodicidad)*  
16. Líder Encargado *(antes: Líder encargado)*  
17. Categoría Líder *(antes: Categoría líder)*  
18. Estado de negocio *(antes: Estado del negocio)*  
19. Fecha de Creación  
20. Fecha de Emisión  
21. Fecha de Fondeo  

**Jerarquía adicional de líderes:** si el export incluye niveles 2+, las columnas `Líder N nombre` / `Líder N categoría` (N ≥ 2) van **después** de **Fecha de Fondeo** y **antes** del bloque de anualidades.

**Anualidades (solo periodicidad Anual):** columnas dinámicas **Fecha Fondeo Anualidad 1** … **Fecha Fondeo Anualidad _n_**, donde _n_ es el máximo de cuotas anuales necesarias en el conjunto exportado (acotado como hoy por reglas de negocio).

### Sin filtro de rango de fondeo

El orden es el mismo bloque común empezando por **Agente** (ítems 3–21 del listado anterior), luego jerarquía extra de líderes si aplica, luego **Fecha Fondeo Anualidad 1..n**.

## Scope

### In Scope

- Implementar el orden y renombres de la sección **Orden canónico de columnas** arriba (incluye encabezados de anualidades como **Fecha Fondeo Anualidad _k_**).
- Mantener columnas condicionales **Fecha inicial fondeo** / **Fecha final fondeo** solo cuando el request incluye par de fechas de fondeo.
- Actualizar formato moneda en ruta si el nombre de la columna de valor cambia.
- Actualizar tests unitarios del mapper y requirement **Enhanced operational Excel export** en spec principal vía delta.

### Out of Scope

- Cambiar datos exportados (mismos campos de negocio/cliente/líder).
- Roles, límites `EXPORT_MAX_ROWS`, estilos de cabecera, ni E2E salvo ajuste mínimo si rompe aserciones por texto.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `negocios`: Requirement de orden y nomenclatura del Excel operacional (escenarios con y sin `dateFrom`/`dateTo`); escenario de formato **Valor de Negocio** debe usar el nuevo nombre literal.

## Approach

1. Centralizar strings de cabecera (o orden único) en `map-business-to-export-row.ts` para que `negociosExportColumnHeaders` y `mapBusinessToExportRow` no diverjan.
2. Ajustar `VALOR_NEGOCIO_COL_NAME` (o import compartido) en `src/app/api/negocios/export/route.ts`.
3. Delta spec en `openspec/changes/excel-negocios-export-columnas/specs/negocios/spec.md`; merge a `openspec/specs/negocios/spec.md` al archivar.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/negocios/lib/map-business-to-export-row.ts` | Modified | Orden + keys fila |
| `src/app/api/negocios/export/route.ts` | Modified | Índice columna moneda |
| `src/features/negocios/lib/__tests__/map-business-to-export-row.test.ts` | Modified | Expectativas orden/nombres |
| `openspec/specs/negocios/spec.md` | Modified (via delta) | Escenarios columnas Excel |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Macros/plantillas externas según nombres viejos | Med | Comunicar cambio; nombres en release notes |
| Desalinear header vs object keys | Baja | Tests que serialicen orden completo |

## Rollback Plan

Revertir PR/commit que toque mapper, route y tests; restaurar delta spec si ya se aplicó merge (git revert en `openspec/specs/negocios/spec.md`).

## Dependencies

- None

## Success Criteria

- [ ] Cabeceras y orden coinciden con lista del proposal en spec (con y sin filtro fecha).
- [ ] Columna de valor conserva formato `$#,##0.00`.
- [ ] Tests del mapper pasan; `vitest` verde en archivos tocados.
