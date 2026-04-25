# Proposal: Ajustes en Creación de Negocio, Excel y Fondeo

## Intent

Optimizar el flujo de creación de negocios reorganizando los campos del formulario para mayor coherencia, actualizar el formato del Excel exportable eliminando columnas redundantes y agregando dinámicamente fechas de fondeo/celular, asegurar las restricciones de eliminación para roles administrativos, y corregir la lógica de fondeo de anualidades para que la fecha del negocio padre se actualice siempre con el último fondeo reportado.

## Scope

### In Scope

- Mover el campo "contrato" de `ClientInfoSection` a `BusinessInfoSection`.
- Eliminar el agrupador `ProductInfoSection` y mover "compañía, producto, plazo" a `BusinessInfoSection`.
- Ordenar los campos en `BusinessInfoSection` estrictamente como: "contrato, compañia, producto, periodicidad, plazo, moneda, valor, agente".
- Eliminar columnas "Mes", "Año" y "Es anualidad" del exporte de Excel.
- Agregar dinámicamente "Fecha inicial fondeo" y "Fecha final fondeo" al Excel solo si se aplican filtros de fecha al inicio del excel, van a ser las primeras columnas.
- Agregar "Celular" después del campo "email" en el Excel.
- Actualizar el campo `dateAnchored` del negocio padre siempre que se fondee una anualidad.

### Out of Scope

- Modificar la lógica de permisos de cancelación, ya que el código actual ya restringe al `COACH` y permite a los roles autorizados.
- Refactorización de componentes fuera del módulo de creación/edición de negocios.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `negocios`: Cambio en el layout del formulario de creación/edición, ajuste en la estructura de datos del archivo Excel exportado, y modificación en la regla de actualización de fecha de fondeo padre al fondear anualidades.

## Approach

1. **Refactor UI**: Eliminar `ProductInfoSection`. Trasladar sus props (como `companiesOptions`, `filteredProducts`) junto con el `contractDisabled` de `ClientInfoSection` hacia `BusinessInfoSectionProps`. Reordenar los inputs dentro del componente.
2. **Ajuste Excel**: Modificar `negociosExportColumnHeaders` y `mapBusinessToExportRow` para aceptar condicionalmente `dateFrom` y `dateTo` inyectados desde `src/app/api/negocios/export/route.ts`. Quitar las columnas deprecadas. Agregar `client.phone`.
3. **Lógica de Fondeo**: En `/api/negocios/[id]/fondear-anualidades/route.ts`, mover el `tx.business.update` fuera del condicional `parentWasEmitido` para que se ejecute en todos los casos de fondeo.

## Affected Areas

| Area                                                                  | Impact   | Description                                 |
| --------------------------------------------------------------------- | -------- | ------------------------------------------- |
| `src/features/negocios/components/sections/client-info-section.tsx`   | Modified | Eliminar campo "contrato"                   |
| `src/features/negocios/components/sections/product-info-section.tsx`  | Removed  | Eliminar componente                         |
| `src/features/negocios/components/sections/business-info-section.tsx` | Modified | Agregar campos nuevos y reordenar           |
| `src/features/negocios/components/create-business-form.tsx`           | Modified | Ajustar props e imports                     |
| `src/features/negocios/lib/map-business-to-export-row.ts`             | Modified | Cambiar columnas del Excel                  |
| `src/app/api/negocios/export/route.ts`                                | Modified | Pasar fechas al helper de exportación       |
| `src/app/api/negocios/[id]/fondear-anualidades/route.ts`              | Modified | Siempre actualizar `dateAnchored` del padre |

## Risks

| Risk                                         | Likelihood | Mitigation                                                                                                               |
| -------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Desalineación de columnas en Excel           | Medium     | Validar que el `push` en headers condicional corresponda exactamente a las keys generadas en la función map del row.     |
| Errores de validación UI al mover "contrato" | Low        | Mantener la lógica de `disabled` si el número de identidad del cliente es corto, pasándola como prop a la nueva sección. |

## Rollback Plan

Revertir los commits relacionados con la historia de usuario y redesplegar el servicio frontend y backend. En caso de fallas graves en base de datos, no aplica porque la migración de datos es mínima (solo updates a fechas).

## Dependencies

- No external dependencies.

## Success Criteria

- [ ] El formulario de negocios solo muestra 2 secciones: Cliente y Negocio, en el orden especificado.
- [ ] El Excel descargado no tiene "Mes", "Año" ni "Es anualidad".
- [ ] El Excel descargado tiene "Celular".
- [ ] El Excel descargado tiene "Fecha inicial fondeo" y "Fecha final fondeo" solo cuando se filtra por fecha en el UI.
- [ ] Fondeos subsecuentes de anualidades actualizan la fecha del padre.
