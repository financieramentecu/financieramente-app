# Especificación de Funcionalidad: Gestión de Reglas de Comisión

**Rama de Funcionalidad**: `004-manage-commission-rules`
**Creado**: 2026-02-10
**Estado**: Borrador
**Entrada**: Descripción del usuario: "Administrar reglas de comisión porcentual de productos para negocios, asignar porcentajes a categorías para distribución de comisiones. Listar configuración de productos..."

## Aclaraciones

### Sesión 2026-02-10

- P: ¿El sistema debe permitir múltiples reglas activas o solo una por configuración? → R: **Puede tener varias reglas activas**. La referencia para los nuevos negocios se define específicamente en el campo `idProductPercentajeCommisionNewBusinesses` de la configuración.
- P: ¿El sistema debe validar que la suma de los porcentajes sea 100%? → R: **No**, no hay restricción. Los porcentajes son independientes y pueden sumar cualquier valor.
- P: ¿Requerimiento especial al editar porcentajes? → R: **Advertencia de Impacto**. El usuario debe ser advertido explícitamente sobre el impacto en negocios y liquidaciones futuras.
- P: ¿Se puede desactivar una configuración con negocios asociados? → R: **No**. Debe bloquearse la acción y mostrar una alerta explicativa al usuario.
- P: ¿Flujo de creación y asignación? → R: **Selección y Agregación**. Se debe seleccionar una configuración existente para crear la regla. Los porcentajes se agregan línea por línea (Categoría + %). Además, se requiere un botón explícito en el listado para asignar la regla por defecto para "Nuevos Negocios".

### Sesión 2026-02-12

- P: ¿Cómo identificar/distinguir reglas en la UI sin campo nombre? → R: **Agregar campo `description`** al modelo `ProductPercentajeCommision` para que el usuario etiquete cada regla.
- P: ¿Formato de entrada de porcentaje en la UI? → R: **Porcentaje entero** (ej: "15" para 15%). El sistema convierte internamente a fracción (`0.15`) para almacenamiento en `Decimal(5,4)`.
- P: ¿Eliminación física o desactivación de reglas? → R: **Solo desactivación** (`active = false`). No se permite eliminación física. La desactivación solo es posible cuando la regla no tiene negocios (`Business`) asociados.
- P: ¿Se puede reactivar una regla previamente desactivada? → R: **Sí**, el administrador puede cambiar el estado de inactiva a activa desde el listado de reglas.
- P: ¿Nomenclatura canónica Prisma vs. Spec? → R: **Renombrar modelos Prisma** al inglés correcto (`ProductPercentageCommission`, `ProductPercentageCommissionCategory`). Requiere migración de renombrado en esta feature.

## Escenarios de Usuario y Pruebas _(obligatorio)_

### Historia de Usuario 1 - Gestionar Reglas de Comisión (Prioridad: P1)

Como Administrador, quiero ver y gestionar (crear, editar, desactivar) reglas de comisión (`ProductPercentageCommission`) para una Configuración de Producto específica, para poder definir cómo se calculan las comisiones en diferentes escenarios.

**Por qué esta prioridad**: Funcionalidad central para configurar la lógica de comisiones.

**Prueba Independiente**: Se puede probar seleccionando una Configuración de Producto y añadiendo/modificando reglas de comisión.

**Escenarios de Aceptación**:

1. **Dado** una Configuración de Producto existente, **Cuando** creo una nueva regla, **Entonces** el sistema la asocia automáticamente a esa configuración.
2. **Dado** la pantalla de creación, **Cuando** selecciono una configuración, **Entonces** habilita el modo de agregación para añadir porcentajes.
3. **Dado** una Regla existente activa sin negocios asociados, **Cuando** la desactivo, **Entonces** su estado cambia a Inactiva.
4. **Dado** una Regla inactiva, **Cuando** la reactivo, **Entonces** su estado cambia a Activa.

---

### Historia de Usuario 2 - Configurar Porcentajes de Distribución por Categoría (Prioridad: P1)

Como Administrador, quiero asignar porcentajes de comisión específicos a Categorías dentro de una Regla de Comisión, para que el sistema sepa cómo distribuir la comisión total entre diferentes interesados (ej: Agencia, Agente).

**Por qué esta prioridad**: Esencial para la lógica de cálculo real.

**Prueba Independiente**: Se puede probar abriendo una Regla de Comisión y añadiendo/editando porcentajes de categoría.

**Escenarios de Aceptación**:

1. **Dado** el modo de agregación de porcentajes, **Cuando** selecciono una `Category` y un porcentaje, **Entonces** se añade a la lista temporal de la regla.
2. **Dado** la lista temporal, **Cuando** guardo la regla completa, **Entonces** se persisten los registros en `ProductPercentageCommissionCategory`.
3. **Dado** una lista de Categorías disponibles, **Cuando** configuro una regla, **Entonces** solo debo poder seleccionar Categorías activas válidas.
4. **Dado** que modifico un porcentaje existente, **Cuando** intento guardar, **Entonces** el sistema muestra una advertencia sobre el impacto en negocios y liquidaciones futuras que debo confirmar.

---

### Historia de Usuario 3 - Listar Configuraciones de Producto (Prioridad: P2)

Como Administrador, quiero ver una lista de Configuraciones de Producto para poder encontrar y seleccionar fácilmente la que necesito configurar.

**Por qué esta prioridad**: Punto de entrada para la navegación.

**Prueba Independiente**: Se puede probar navegando a la página de "Configuración de Comisiones".

**Escenarios de Aceptación**:

1. **Dado** que estoy en la página de configuración, **Cuando** la página carga, **Entonces** veo una lista paginada de elementos `ProductConfiguration` mostrando Nombre del Producto, Origen del Cliente y Categoría.
2. **Dado** la lista, **Cuando** hago clic en "Gestionar Reglas" en un elemento, **Entonces** navego a la vista detallada de gestión de reglas para esa configuración.
3. **Dado** el listado de reglas de una configuración, **Cuando** hago clic en el botón "Asignar a Nuevos Negocios" sobre una regla específica, **Entonces** esa regla se marca como la predeterminada para nuevos negocios (`NewBusinesses`) y se actualiza la configuración.

## Casos Borde (Edge Cases)

- **EC-001**: **Categorías Duplicadas**: El sistema debe prevenir agregar la misma Categoría más de una vez a una sola Regla de Comisión.
- **EC-002**: **Porcentajes Negativos**: El sistema debe bloquear el envío si algún valor de porcentaje es negativo.
- **EC-003**: **Desactivar Regla Principal**: Si se desactiva una regla que está marcada como la predeterminada para "Nuevos Negocios" (`NewBusinesses`), el sistema debe advertir que se requiere asignar una nueva regla predeterminada.

- **EC-004**: **Sin Categorías Seleccionadas**: Se puede crear una regla sin categorías inicialmente, pero debe marcarse visualmente como "Incompleta".

## Requerimientos _(obligatorio)_

### Requerimientos Funcionales

- **RF-001**: El sistema DEBE proporcionar una vista para listar todos los registros de `ProductConfiguration` con capacidades de búsqueda/filtro.
- **RF-002**: El sistema DEBE permitir crear múltiples registros `ProductPercentageCommission` para una sola `ProductConfiguration`.
- **RF-003**: El sistema DEBE permitir agregar registros `ProductPercentageCommissionCategory` a una `ProductPercentageCommission`.
- **RF-004**: El sistema DEBE permitir seleccionar una `Category` de la lista maestra al crear una regla de distribución.
- **RF-005**: El sistema DEBE validar que el porcentaje ingresado sea un valor decimal positivo. La UI acepta porcentajes enteros (ej: "15" para 15%) y el sistema convierte a fracción (÷100) antes de almacenar en `Decimal(5,4)`. Rango válido de entrada: `0.01` a `999.99` (almacenado como `0.0001` a `9.9999`).
- **RF-006**: El sistema DEBE permitir desactivar (`active = false`) y reactivar (`active = true`) una `ProductPercentageCommission`. No se permite eliminación física. La desactivación solo es posible si la regla no tiene Negocios (`Business`) asociados; de lo contrario, el sistema bloquea la acción con una alerta. La reactivación no tiene restricciones.
- **RF-007**: El sistema DEBE mostrar los porcentajes configurados existentes para una regla.
- **RF-008**: El sistema DEBE permitir múltiples reglas activas simultáneamente para una `ProductConfiguration`.
- **RF-009**: El sistema NO debe validar que la suma de porcentajes de distribución sea 100% (pueden ser independientes).
- **RF-010**: El sistema DEBE mostrar un mensaje de confirmación explícito al editar una regla existente, advirtiendo que los cambios afectarán a los negocios asociados y a las próximas liquidaciones.
- **RF-011**: El sistema DEBE impedir la desactivación de una `ProductConfiguration` (o sus reglas) si existen Negocios (`Business`) asociados, mostrando una alerta de bloqueo al usuario.
- **RF-012**: El sistema DEBE permitir asignar una Regla de Comisión específica como la predeterminada para "Nuevos Negocios" mediante una acción explícita en la UI (actualizando `ProductConfiguration.idProductPercentageCommissionNewBusinesses`).
- **RF-013**: La interfaz de creación de reglas DEBE utilizar un "modo de agregación" donde el usuario selecciona una Configuración de Producto y luego añade múltiples líneas de Categoría/Porcentaje antes de guardar.
- **RF-014**: El modelo `ProductPercentageCommission` DEBE incluir un campo `description` (texto opcional, máx. 255 caracteres) que el usuario puede asignar al crear o editar una regla para identificarla en el listado.
- **RF-015**: Los modelos Prisma DEBEN renombrarse al inglés correcto: `ProductPercentajeCommision` → `ProductPercentageCommission`, `ProductPercentajeCommisionCategory` → `ProductPercentageCommissionCategory`. Las tablas subyacentes en BD mantienen sus nombres (`@@map`). Requiere migración.

### Entidades Clave _(incluir si la funcionalidad involucra datos)_

- **ProductConfiguration**: La entidad padre (ya existe).
- **ProductPercentageCommission**: Representa un conjunto de reglas específico (ya existe como `ProductPercentajeCommision`). **Requiere migración**: renombrar modelo y agregar campo `description` (`VARCHAR(255)`, opcional) para identificación por el usuario en la UI.
- **ProductPercentageCommissionCategory**: Tabla de enlace que define el % para una Categoría específica bajo una Regla (ya existe como `ProductPercentajeCommisionCategory`). **Requiere migración**: renombrar modelo.
- **Category**: Tabla de referencia para los receptores de la comisión.

## Criterios de Éxito _(obligatorio)_

### Resultados Medibles

- **CE-001**: El administrador puede configurar una regla de comisión completa con al menos 2 distribuciones de categoría en menos de 2 minutos.
- **CE-002**: Los cálculos de comisión (funcionalidad futura) recuperan con éxito estos porcentajes configurados.
- **CE-003**: La interfaz carga las Configuraciones de Producto en menos de 1 segundo.
- **CE-004**: Se mantiene la integridad de los datos (sin registros de distribución huérfanos).
