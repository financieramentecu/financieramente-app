# Feature Specification: Administración de Configuración de Producto

**Feature Branch**: `001-product-config-management`
**Created**: 2026-02-05
**Status**: Draft
**Input**: User description: "Como usuario quiero poder administrar la configuración del producto para poder generar las tablas de configuración de distribución a los negocios creados. Que me permita crear el code identificado (combinación PRODUCT-ORIGEN-CATEGORIA), que me permita crear, actualizar e inactivar configuraciones."

## Clarifications

### Session 2026-02-05

- Q: Debería permitirse editar producto/origen/categoría en configuraciones con negocios vinculados? → A: No. La combinación producto-origen-categoría es inmutable una vez creada. El único campo editable es la referencia al ProductPercentajeCommision para nuevos negocios (id_product_percentaje_commision_new_businesses).
- Q: Cómo se maneja el estado activo/inactivo de la configuración de producto? → A: Agregar campo `active` (boolean) directamente en ProductConfiguration, siguiendo el patrón de ProductPercentajeCommision.
- Q: Qué configuraciones se muestran por defecto en el listado? → A: Mostrar todas (activas e inactivas) por defecto, cada una con un tag visual de estado, con filtro disponible para filtrar por estado.
- Q: Cuál es el formato exacto del código identificador? → A: Se calcula con la combinación de product name, origin client name y category name. Espacios dentro de cada nombre se reemplazan por `_`. Segmentos separados por `-`. Todo en mayúsculas. Formato: `PRODUCT_NAME-ORIGIN_NAME-CATEGORY_NAME`. Ejemplo: `CREA_PATRIMONIO-PROPIO-JUNIOR`.
- Q: Se debe asignar un ProductPercentajeCommision al crear una ProductConfiguration? → A: Sí. Al crear una ProductConfiguration se debe asignar un `id_product_percentaje_commision_new_businesses`. Si no existe un ProductPercentajeCommision disponible, el sistema debe auto-crear uno para poder asignarlo.
- Q: Cómo se resuelve la dependencia circular entre ProductConfiguration y ProductPercentajeCommision? → A: En la creación inicial, se ejecuta en una sola transacción: (1) crear ProductConfiguration sin PPC, (2) crear PPC con referencia a la config, (3) actualizar config con el PPC. Este flujo solo aplica cuando no existe un PPC. Posteriormente se pueden crear más PPCs para la misma configuración y editar la configuración para cambiar cuál PPC es la referencia para nuevos negocios.
- Q: Se deben agregar los porcentajes por categoría (ProductPercentajeCommisionCategory) en la creación inicial? → A: No. El PPC se auto-crea vacío (sin categorías de porcentaje). La gestión de ProductPercentajeCommisionCategory se maneja en un feature/flujo separado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear Configuración de Producto (Priority: P1)

Como administrador del sistema, quiero crear una nueva configuración de producto seleccionando un producto, un origen de cliente y una categoría, para que el sistema genere automáticamente el código identificador (formato `PRODUCT_NAME-ORIGIN_NAME-CATEGORY_NAME`), asigne un ProductPercentajeCommision para nuevos negocios y establezca la configuración de distribución que se aplicará a los nuevos negocios.

**Why this priority**: Sin la capacidad de crear configuraciones, no existe base para distribuir comisiones a los negocios. Es el flujo fundamental que habilita todo el módulo de distribución.

**Independent Test**: Se puede verificar creando una configuración con un producto, origen y categoría existentes, confirmando que el código se genera correctamente, que se asigna un ProductPercentajeCommision para nuevos negocios, y que la configuración queda registrada y visible en el listado.

**Acceptance Scenarios**:

1. **Given** el usuario está en la pantalla de administración de configuraciones de producto, **When** selecciona un producto, un origen y una categoría válidos y confirma la creación, **Then** el sistema genera el código identificador en formato `PRODUCT_NAME-ORIGIN_NAME-CATEGORY_NAME` (todo en mayúsculas, espacios dentro de cada nombre reemplazados por `_`, segmentos separados por `-`; ejemplo: `CREA_PATRIMONIO-PROPIO-JUNIOR`), asigna automáticamente un ProductPercentajeCommision para nuevos negocios, y registra la configuración exitosamente.
2. **Given** el usuario crea una configuración y no existe un ProductPercentajeCommision disponible, **When** confirma la creación, **Then** el sistema ejecuta una transacción que crea la configuración, auto-crea un ProductPercentajeCommision vinculado, y asigna el PPC como referencia para nuevos negocios. La operación es transparente para el usuario.
3. **Given** el usuario intenta crear una configuración con una combinación de producto-origen-categoría que ya existe, **When** confirma la creación, **Then** el sistema muestra un mensaje de error indicando que esa combinación ya está registrada y no permite duplicados.
4. **Given** el usuario no ha seleccionado uno o más campos obligatorios (producto, origen o categoría), **When** intenta confirmar la creación, **Then** el sistema muestra mensajes de validación indicando los campos faltantes.

---

### User Story 2 - Consultar y Buscar Configuraciones de Producto (Priority: P2)

Como administrador del sistema, quiero visualizar un listado de todas las configuraciones de producto existentes con capacidad de búsqueda y filtrado, para poder encontrar rápidamente una configuración específica y revisar su estado.

**Why this priority**: La consulta es necesaria antes de poder actualizar o inactivar configuraciones. Proporciona visibilidad sobre las configuraciones existentes y permite tomar decisiones informadas.

**Independent Test**: Se puede verificar accediendo al listado de configuraciones y comprobando que muestra la información clave (código, producto, origen, categoría, estado) y que los filtros reducen correctamente los resultados.

**Acceptance Scenarios**:

1. **Given** existen configuraciones de producto registradas, **When** el usuario accede al listado de configuraciones, **Then** el sistema muestra todas las configuraciones (activas e inactivas) en una tabla con las columnas: código identificador, nombre del producto, nombre del origen, nombre de la categoría y estado representado con un tag visual (activo/inactivo).
2. **Given** el usuario está en el listado de configuraciones, **When** escribe un término de búsqueda (por código, nombre de producto, origen o categoría), **Then** el listado se filtra mostrando solo las configuraciones que coincidan con el criterio.
3. **Given** el usuario está en el listado de configuraciones, **When** aplica el filtro de estado seleccionando "activo" o "inactivo", **Then** el listado muestra únicamente las configuraciones con el estado seleccionado.
4. **Given** el listado contiene más de 10 configuraciones, **When** el usuario navega por las páginas, **Then** el sistema muestra los resultados paginados manteniendo el orden y los filtros aplicados.

---

### User Story 3 - Actualizar Configuración de Producto (Priority: P3)

Como administrador del sistema, quiero poder actualizar la referencia de distribución de comisiones para nuevos negocios en una configuración de producto existente, seleccionando entre los ProductPercentajeCommision disponibles para esa configuración, para ajustar qué tabla de porcentajes de comisión se aplica al crear nuevos negocios.

**Why this priority**: Permite ajustar la distribución de comisiones para nuevos negocios sin necesidad de inactivar y recrear la configuración completa. A medida que se crean más PPCs para una configuración, el administrador necesita poder elegir cuál aplica para nuevos negocios.

**Independent Test**: Se puede verificar seleccionando una configuración existente, cambiando la referencia de distribución para nuevos negocios eligiendo entre los PPCs disponibles, guardando y confirmando que el cambio persiste al recargar la vista.

**Acceptance Scenarios**:

1. **Given** el usuario selecciona una configuración existente para editar, **When** selecciona un ProductPercentajeCommision diferente de la lista de PPCs disponibles para esa configuración y confirma, **Then** el sistema actualiza la referencia para nuevos negocios preservando la combinación producto-origen-categoría y el código identificador sin cambios.
2. **Given** el usuario está editando una configuración, **When** intenta modificar el producto, origen o categoría, **Then** el sistema no permite la edición de esos campos (son inmutables una vez creada la configuración).
3. **Given** la configuración solo tiene un ProductPercentajeCommision, **When** el usuario accede a editar, **Then** el selector de PPC muestra solo una opción y no permite cambiar la referencia (ya está asignada).
4. **Given** el usuario está editando una configuración, **When** cancela la edición sin guardar, **Then** el sistema descarta los cambios y regresa al listado sin modificaciones.

---

### User Story 4 - Inactivar y Reactivar Configuración de Producto (Priority: P4)

Como administrador del sistema, quiero poder inactivar una configuración de producto que ya no se debe usar para nuevos negocios, y reactivarla si es necesario, para controlar qué configuraciones están disponibles sin perder el historial.

**Why this priority**: Es necesaria para el ciclo de vida completo de las configuraciones, permitiendo desactivar combinaciones obsoletas sin eliminar datos históricos que podrían estar vinculados a negocios existentes.

**Independent Test**: Se puede verificar inactivando una configuración activa y confirmando que su estado cambia a inactivo, y luego reactivándola para confirmar el cambio inverso.

**Acceptance Scenarios**:

1. **Given** una configuración tiene estado activo, **When** el usuario ejecuta la acción de inactivar, **Then** el sistema solicita confirmación y al confirmar cambia el estado a inactivo.
2. **Given** una configuración tiene estado inactivo, **When** el usuario ejecuta la acción de reactivar, **Then** el sistema cambia el estado a activo.
3. **Given** una configuración tiene negocios asociados, **When** el usuario la inactiva, **Then** la configuración se marca como inactiva pero los negocios existentes no se ven afectados y mantienen su configuración de distribución original.
4. **Given** una configuración está inactiva, **When** un usuario intenta crear un nuevo negocio con esa combinación, **Then** el sistema no muestra esa configuración como opción disponible para nuevos negocios.

---

### Edge Cases

- Que sucede cuando se intenta crear una configuración con un producto, origen o categoría que fue recientemente inactivado? El sistema debe validar que los tres elementos estén activos al momento de crear la configuración.
- Que sucede cuando se elimina o inactiva un producto, origen o categoría que tiene configuraciones asociadas activas? El sistema debe advertir al administrador y no permitir la inactivación del elemento padre mientras existan configuraciones activas dependientes, o en su defecto, inactivar en cascada las configuraciones afectadas.
- Que sucede cuando dos usuarios intentan modificar la misma configuración simultáneamente? El sistema debe aplicar el último cambio guardado e informar al segundo usuario si los datos han cambiado desde que los cargó.
- Que sucede cuando el código generado excede la longitud máxima permitida (50 caracteres)? El sistema debe truncar o advertir al usuario antes de guardar.
- Que sucede si falla la auto-creación del ProductPercentajeCommision durante la transacción de creación? El sistema debe revertir toda la transacción (incluyendo la ProductConfiguration) y mostrar un error claro al usuario.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear una configuración de producto seleccionando un producto, un origen de cliente y una categoría existentes y activos.
- **FR-002**: El sistema DEBE generar automáticamente el código identificador en formato `PRODUCT_NAME-ORIGIN_NAME-CATEGORY_NAME` (todo en mayúsculas, espacios dentro de cada nombre reemplazados por `_`, segmentos separados por `-`) al momento de crear una configuración. Ejemplo: `CREA_PATRIMONIO-PROPIO-JUNIOR`. El código es inmutable una vez generado.
- **FR-003**: El sistema DEBE validar la unicidad de la combinación producto-origen-categoría e impedir la creación de configuraciones duplicadas.
- **FR-004**: El sistema DEBE mostrar un listado de configuraciones de producto con la información del código, producto, origen, categoría y estado.
- **FR-005**: El sistema DEBE permitir buscar y filtrar configuraciones por código, nombre de producto, nombre de origen, nombre de categoría o estado.
- **FR-006**: El sistema DEBE paginar el listado de configuraciones cuando existan más de 10 registros.
- **FR-007**: El sistema DEBE permitir actualizar únicamente la referencia de distribución de comisiones para nuevos negocios en una configuración existente. La combinación producto-origen-categoría y el código identificador son inmutables una vez creada la configuración.
- **FR-008**: El sistema DEBE permitir inactivar una configuración activa, requiriendo confirmación del usuario antes de ejecutar el cambio.
- **FR-009**: El sistema DEBE permitir reactivar una configuración previamente inactivada.
- **FR-010**: El sistema DEBE mantener el historial de configuraciones inactivadas sin eliminarlas, preservando la integridad de los negocios existentes que las referencian.
- **FR-011**: El sistema DEBE validar que el producto, origen y categoría seleccionados estén activos al momento de crear una configuración.
- **FR-012**: El sistema DEBE impedir que configuraciones inactivas se muestren como opciones disponibles al crear nuevos negocios.
- **FR-013**: El sistema DEBE mostrar mensajes de error descriptivos cuando una operación de creación o actualización falle por validaciones (duplicados, campos faltantes, entidades inactivas).
- **FR-014**: El sistema DEBE restringir el acceso a la administración de configuraciones únicamente a usuarios con permisos de administrador.
- **FR-015**: Al crear una ProductConfiguration, si no existe un ProductPercentajeCommision disponible, el sistema DEBE ejecutar en una sola transacción: (1) crear la ProductConfiguration sin PPC, (2) crear un ProductPercentajeCommision vinculado a la configuración, (3) actualizar la configuración asignando el PPC como referencia para nuevos negocios (`id_product_percentaje_commision_new_businesses`). Esta operación debe ser transparente para el usuario.
- **FR-016**: El sistema DEBE permitir crear ProductPercentajeCommision adicionales vinculados a una ProductConfiguration existente, para ofrecer diferentes tablas de distribución de comisiones.
- **FR-017**: El sistema DEBE permitir al administrador cambiar cuál ProductPercentajeCommision es la referencia para nuevos negocios (`id_product_percentaje_commision_new_businesses`), seleccionando entre los PPCs disponibles para esa configuración.

### Key Entities

- **Configuración de Producto**: Representa la combinación única de un producto, un origen de cliente y una categoría. Contiene un código identificador generado automáticamente, un campo `active` (boolean) para controlar si está disponible para nuevos negocios, una referencia obligatoria al ProductPercentajeCommision para nuevos negocios (asignada al momento de la creación; si no existe uno, se auto-crea), y fechas de creación y actualización. La combinación producto-origen-categoría es inmutable una vez creada. Es la entidad central que vincula la distribución de comisiones con los negocios.
- **ProductPercentajeCommision**: Tabla de configuración de porcentajes de distribución de comisiones. Pertenece a una ProductConfiguration (relación obligatoria). Se auto-crea vacío (sin categorías de porcentaje) en transacción al crear la primera ProductConfiguration si no existe uno disponible. Pueden existir múltiples PPCs para una misma configuración. Uno de ellos se designa como referencia para nuevos negocios mediante `id_product_percentaje_commision_new_businesses`. La gestión de sus porcentajes por categoría (ProductPercentajeCommisionCategory) es un flujo separado.
- **Producto**: Representa un producto financiero ofrecido por una compañía aseguradora. Tiene nombre, descripción y estado. Es uno de los tres componentes del código identificador.
- **Origen de Cliente**: Representa la fuente o canal por el cual llega el cliente (ej: propio, referido). Tiene nombre, descripción y estado. Es uno de los tres componentes del código identificador.
- **Categoría**: Representa la clasificación del agente o distribuidor (ej: Junior, Senior, Coach). Tiene código, nombre, tipo y estado. Es uno de los tres componentes del código identificador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los administradores pueden crear una nueva configuración de producto en menos de 30 segundos seleccionando producto, origen y categoría.
- **SC-002**: El código identificador se genera correctamente en el 100% de las creaciones, siguiendo el formato `PRODUCT_NAME-ORIGIN_NAME-CATEGORY_NAME`.
- **SC-003**: Los administradores pueden encontrar una configuración específica mediante búsqueda en menos de 10 segundos.
- **SC-004**: El 100% de los intentos de crear configuraciones duplicadas son rechazados con un mensaje de error claro.
- **SC-005**: Las configuraciones inactivas no aparecen como opción en el 100% de los flujos de creación de nuevos negocios.
- **SC-006**: Los negocios existentes no se ven afectados en ningún caso al inactivar una configuración de producto.

## Assumptions

- Los productos, orígenes de cliente y categorías ya existen en el sistema y se administran desde sus respectivos módulos. Este feature no incluye la administración de esas entidades.
- El formato del código identificador sigue la convención existente: `PRODUCT_NAME-ORIGIN_NAME-CATEGORY_NAME` en mayúsculas, espacios dentro de cada nombre reemplazados por `_`, segmentos separados por `-`.
- Solo usuarios con rol de administrador tienen acceso a esta funcionalidad.
- La inactivación es una operación blanda (soft delete) que cambia el estado pero no elimina el registro.
- El listado se pagina en bloques de 10 registros por defecto.
- Al crear una ProductConfiguration, el sistema auto-crea un ProductPercentajeCommision vacío (sin categorías de porcentaje) si no existe uno disponible, y lo asigna como referencia para nuevos negocios. La gestión de ProductPercentajeCommisionCategory (porcentajes de distribución por categoría dentro de cada PPC) es un flujo/feature separado fuera del alcance de este feature.
