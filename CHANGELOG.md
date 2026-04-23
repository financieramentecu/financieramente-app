# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).


## [1.0.0-beta.15] - 2026-04-23

### Añadido

- **Negocios – Exportación a Excel mejorada:** Rediseño completo del formato de exportación para análisis de liquidación. El archivo incluye cabeceras profesionales con fondo azul claro y texto en negrita, así como ajuste automático del ancho de todas las columnas según el contenido.
- **Negocios – Campos de tiempo y moneda:** Se añadieron las columnas **Mes** (nombre completo en español) y **Año** calculados desde la emisión. La columna **Valor negocio** cuenta ahora con formato nativo de moneda (`$#,##0.00`).

### Mejorado

- **Negocios – Orden Operativo:** Reordenamiento y renombramiento de las 22 columnas críticas (Agente, Nombres y Apellidos del Cliente, etc.) para cumplir con el flujo de auditoría operativa y liquidación manual.

### Documentación / Interno

- **OpenSpec:** Sincronización de requerimientos de exportación avanzada en el spec maestro de `negocios` y archivo completo del cambio `excel-negocios-export` con todas sus verificaciones.

## [1.0.0-beta.14] - 2026-04-22

### Añadido

- **Base de Datos – Carga Inicial (Seed):** Refactorizado el proceso de carga maestro (`prisma db seed`). El sistema ya no inserta datos parciales harcodeados, sino que pobla dinámicamente todo el portafolio de la operación basándose en el catálogo documentado (8 compañías y decenas de productos financieros asociados listos para operar).
- **Carga Inicial – Trazabilidad Dinámica:** Garantizada la integridad relacional (_Foreign Keys_) mediante un motor de _lookup asíncrono_ que asocia nativamente los productos a la empresa propietaria sin importar el desfasaje de IDs autoincrementales.

### Documentación / Interno

- **OpenSpec:** Desarrolladas e integradas las especificaciones de comportamiento `seed-pipeline`; cerrado y archivado de manera completa el registro `register-companies-products-csv`.


## [1.0.0-beta.13] - 2026-04-22

### Añadido

- **Crear negocio – Comisión por porcentaje (PPC):** Si no hay reglas específicas de comisión para producto, origen o categoría, el sistema puede usar una **configuración global porcentual** cuando exista, para no bloquear la creación por falta de una distribución puntual.

### Mejorado

- **Listado de negocios:** El orden por defecto es por **fecha de creación** (más recientes primero), con **desempate estable** por identificador del negocio. En la tabla puedes **ordenar** por **Estado** y **Fecha creación**.
- **Fondeo directo:** Antes de **Fondear** un negocio **Emitido** cuando aplica el flujo sin anualidades, aparece un **diálogo de confirmación** y, al confirmar, un **indicador de carga** mientras se procesa. Si el negocio tiene **cuotas anuales** en juego, este paso no interrumpe el **flujo de fondeo por anualidades**.

### Corregido

- **Categoría del agente:** La categoría queda **alineada con la categoría asignada** al negocio cuando corresponde ese mapeo.

### Documentación / Interno

- **OpenSpec:** Requisitos de PPC global, orden de listado y UX de fondeo incorporados al spec `negocios`; change **default-global-ppc-for-business-create** archivado (`openspec/changes/archive/2026-04-22-default-global-ppc-for-business-create/`).

## [1.0.0-beta.12] - 2026-04-21

### Añadido

- **Negocios – Estado Liquidado:** En el **listado principal** ves el estado **Liquidado** con la **misma presentación** que en el detalle (modal), gracias al badge compartido. El filtro de estado incluye **Liquidado**; la opción heredada **Comisionando** **no** aparece en el desplegable renovado (si la API aún devuelve ese valor legacy, la fila sigue mostrando un **indicador de estado** sin quedar en blanco).

### Mejorado

- **Listado de negocios:** La columna de creación se llama **Fecha creación** para distinguirla de emisión y fondeo; el mapeo desde la API evita etiquetar por error como **Cancelado** estados válidos o aún no contemplados en la UI.
- **Liquidación de comisiones:** Los negocios vinculados pasan a **Liquidado** solo cuando ya estaban **Fondeados**, en línea con el flujo **Emitido → Fondeado → Liquidado** (no se promueve desde **Emitido** en ese paso).

### Documentación / Interno

- **Base de datos:** Migración Prisma que alinea el valor legacy **COMISIONANDO** con **LIQUIDADO** en el enum de estado del negocio; en cada entorno aplicar **`prisma migrate deploy`** antes de usar esta versión en producción.
- **OpenSpec:** Specs principales `negocios` y `pre-liquidacion` actualizados; change **2026-04-20-h6-listado-negocios-mejorado** archivado (`openspec/changes/archive/2026-04-21-2026-04-20-h6-listado-negocios-mejorado/`) con verificación y reporte de archivo.

## [1.0.0-beta.11] - 2026-04-18

### Añadido

- **Negocios – Exportar a Excel:** **Administrador**, **Asistente de gerencia operativa** y **Analista de soporte** pueden descargar un archivo **.xlsx** con el mismo conjunto de negocios que resulta de aplicar **búsqueda**, **estado** y **rango de fechas** en el listado. El archivo incluye identificador y contrato, estado, fechas de creación, emisión y fondeo, datos de cliente y producto, periodicidad y anualidades, categoría del coach, **cadena de líderes** y **fechas de fondeo por cuota anual** cuando aplica. Si el resultado supera **5 000 filas**, la exportación se rechaza con un mensaje claro en lugar de generar un archivo desmedido.

### Mejorado

- **Negocios – Fechas:** Las fechas relevantes en listado y export usan una zona horaria consistente (**América/Bogotá**) para una lectura uniforme.

### Documentación / Interno

- **OpenSpec:** Requisitos H5 de exportación Excel incorporados al spec `negocios`; change **2026-04-18-h5-reporte-excel-negocios** archivado (`openspec/changes/archive/2026-04-18-h5-reporte-excel-negocios/`) con diseño, tareas, verificación e informe de archivo.

## [1.0.0-beta.10] - 2026-04-18

### Añadido

- **Negocios – Fondeo por cuotas anuales:** Si el negocio tiene **anualidades** con al menos una cuota **sin fondear**, en el listado aparece **Fondear anualidad** (también cuando el padre ya está **Fondeado** y aún quedan cuotas pendientes). El **modal** muestra el **contrato en el título**, lista **todas las cuotas**, las ya fondeadas con **fecha de anclaje**, y permite elegir cuotas pendientes antes de confirmar. La confirmación usa una **API dedicada** para anualidades y queda **auditada**. El botón **Fondear** directo solo aplica cuando **no hay filas de anualidad**; si existen, el fondeo general por la ruta antigua queda **bloqueado** para evitar inconsistencias.

### Documentación / Interno

- **OpenSpec:** Requisitos HU4 de fondeo por anualidades incorporados al spec `negocios`; change **hu4-fondeo-anualidades** archivado (`openspec/changes/archive/2026-04-18-2026-04-18-hu4-fondeo-anualidades/`) con informe de verificación.

## [1.0.0-beta.9] - 2026-04-18

### Añadido

- **Negocios – Fondeo sin anualidades:** En el listado, si el negocio está **Emitido** y **no tiene anualidades** registradas, aparece la acción **Fondear** para **Agente** (sus negocios), **Asistente gerencia operativa** y **Administrador**. Al confirmar, el estado pasa a **Fondeado**, se guarda la **fecha de anclaje** y queda registrado en auditoría.
- **Listado de negocios:** Puedes **filtrar por estado Fondeado** y ver el **badge Fondeado** (estilo distintivo) en la tabla y vistas coherentes con el estado.

### Mejorado

- **Estados del negocio:** La definición canónica de estados (`BUSINESS_STATUS`) queda centralizada para evitar discrepancias entre pantallas y API.

### Documentación / Interno

- **Base de datos:** Columna `date_anchored` en `business` y migración Prisma; en cada entorno aplicar **`prisma migrate deploy`** antes de usar esta versión en producción.
- **OpenSpec:** Requisitos de fondeo sin anualidades y SSOT de estados incorporados al spec `negocios`; change **hu3-fondeo-sin-anualidades** archivado (`openspec/changes/archive/2026-04-18-hu3-fondeo-sin-anualidades/`) con informe de verificación.

## [1.0.0-beta.8] - 2026-04-17

### Añadido

- **Negocios – Fecha de emisión:** Al registrar el **contrato** por primera vez (ya sea en la creación del negocio o al pasar de **Venta efectuada** a **Emitido**), el sistema guarda la **fecha de emisión** para trazabilidad y reportes. Si solo se **corrige el número de contrato** cuando el negocio ya está emitido, la fecha de emisión **no se modifica**.

### Documentación / Interno

- **Base de datos:** Columna `date_issued` en `business` y migración Prisma; en cada entorno aplicar **`prisma migrate deploy`** antes de usar esta versión en producción.
- **OpenSpec:** Requisitos de fecha de emisión incorporados al spec `negocios`; change **business-date-issued-hu2** archivado con artefactos SDD y verificación.

## [1.0.0-beta.7] - 2026-04-17

### Añadido

- **Negocios – Periodicidad Anual:** Al crear un negocio con periodicidad de compra **Anual** y un **plazo** entre **1 y 25**, el sistema **registra en la base de datos** una fila de anualidad por cada año de plazo (índices 1…n), en estado inicial **sin fondear** y **sin fecha de fondeo** hasta un proceso posterior. En este caso el plazo **es obligatorio**; la regla de **Venta efectuada** sin contrato al crear se mantiene.

### Mejorado

- **Plazo del negocio:** Tope **máximo 25** (años) alineado entre formulario y validación en servidor, coherente con el registro de anualidades.
- **Contrato (rezagos):** Texto de ayuda más claro en la búsqueda de contrato y forma de **vaciar** la selección sin quedar anclado al valor anterior.

### Documentación / Interno

- **Base de datos:** Tabla `annual_payment` y migración Prisma; en cada entorno aplicar **`prisma migrate deploy`**.
- **OpenSpec:** Requisitos de anualidades al crear negocio en el spec `negocios`; change **annual-payment-rows-on-create-h1** archivado con informe de verificación.
- **PRDs:** Documentos de configuración de comisiones movidos a `PRDs/configuration-distribution/`; borrador de reporte de negocios en `PRDs/bussines-report/`.

## [1.0.0-beta.6] - 2026-04-15

### Añadido

- **Asistente en dos pasos** para el flujo **configuración de producto → distribución de comisiones**: siempre ves en qué paso estás (indicador con “Paso 1 de 2” / “Paso 2 de 2”).
- **Tras crear una configuración nueva**, la app te lleva al **formulario de distribución** usando el **código** de la configuración (ruta por código), para seguir sin buscar la fila a mano.
- **Columna Distribución** en el listado de configuraciones de producto: muestra si la distribución está **pendiente** o **configurada** y un enlace **Continuar configuración** cuando aún falta completarla.

### Mejorado

- El control **Agregar categoría** en la pantalla de distribución se ve claramente como **acción principal** (no solo como texto suelto).
- **Migas de pan:** los códigos con caracteres especiales (por ejemplo `+`) se leen bien en la ruta y los enlaces intermedios llevan a páginas válidas.

### Corregido

- **Primera distribución tras crear la configuración:** ya no aparece el error por “distribución activa duplicada”; se **actualiza** la regla inicial que crea el sistema en lugar de intentar crear otra.
- **Enlaces y redirecciones con código en la URL** (segmentos codificados como `%2B`): la configuración se encuentra correctamente al abrir el flujo desde el listado o tras guardar.
- **Redirección inmediata** tras guardar la configuración: es fiable porque usa el resultado devuelto al guardar, no solo el estado async en segundo plano.

### Documentación / Interno

- Requisitos **RF-11** incorporados al spec principal `product-configuration`; cambio OpenSpec **archivado** (`openspec/changes/archive/2026-04-14-rf-11-wizard-post-crear-a/`) con informe de verificación.

## [1.0.0-beta.5] - 2026-04-14

### Corregido

- **RF-11 Wizard (post–crear configuración):** Tras crear la configuración de producto, la redirección al **paso 2** (`/config-distribucion-comisiones/{código}/reglas/crear`) se hace de forma fiable en el **submit** usando el valor devuelto por la mutación (`createProductConfiguration` → `ProductConfiguration | null`), en lugar de depender solo de `useEffect` sobre el estado async.
- **Distribución – “Continuar configuración”:** Al completar la distribución no se intenta crear un segundo `ProductPercentageCommission` (rechazado si ya hay uno activo); se detecta la regla semilla sin líneas de categoría y el formulario pasa a **editar** (actualizar la existente).
- **Resolución por código en URL:** Normalización con `decodeURIComponent` en cliente y en `GET /api/product-configurations/by-code/[code]` para códigos con caracteres codificados (p. ej. `+` como `%2B`), evitando “Configuración no encontrada” tras redirección.
- **Migas de pan:** Las etiquetas muestran el código decodificado y los enlaces usan segmentos codificados correctamente; etiquetas amigables para rutas de configuración de distribución y reglas.

### Mejorado

- **Configuración de producto – Listado:** La tabla compartida (configuración de producto y vista de distribución de comisiones que reutiliza el mismo listado) **ya no muestra** la columna **Distribución para nuevos negocios**. La asignación de la distribución para nuevos negocios sigue haciéndose en los flujos de edición/asignación (B/C); solo se simplifica lo que ves en el listado.

### Documentación / Interno

- **OpenSpec:** Requisito RF-09 en el spec principal `product-configuration`; change `rf-09-remove-list-column-nuevos-negocios` archivado con informe de verificación.
- **OpenSpec (RF-11):** Change `rf-11-wizard-post-crear-a` — `tasks.md` actualizado (fase 3 redirección a `/reglas/crear`, fase 7 seguimiento); `exploration.md` con tabla de implementación aplicada.

## [1.0.0-beta.4] - 2026-04-13

### Añadido

- **Administración – Config. distribución de comisiones:** Nuevo acceso en el menú lateral (dentro de **Administración**) que abre un flujo donde **identificas la configuración de producto por código** antes de ver la tabla de reglas de distribución. Incluye búsqueda, selección y **enlaces directos** que conservan el código en la URL cuando es válido.
- **Reglas (flujo por código):** Botón **Buscar nueva distribución** para volver a la pantalla de búsqueda y elegir otra configuración sin perder el contexto del flujo nuevo.
- **Tabla de reglas de distribución:** Las acciones **Editar** y **Asignar a nuevos negocios** quedan **visibles en cada fila**, sin tener que abrir primero el menú de tres puntos.

### Mejorado

- **Configuración de producto:** El enlace principal **Distribución de Comisión** en el listado lleva al **flujo por código** (ruta nueva del dashboard). Si una fila no tiene código usable (datos heredados), el enlace te dirige a la **entrada de búsqueda** para localizar la configuración correctamente.
- **Barra lateral y tooltips:** Ajustes en submenús anidados y en tooltips para que textos largos (por ejemplo nombres de secciones) se lean bien y no queden recortados de forma confusa.
- **Carga de archivos:** Navegación más clara, pestañas tipo tarjeta y etiquetas alineadas con el flujo de archivos e historial.

### Compatibilidad

- Siguen disponibles las URLs **por id** del flujo clásico (`…/distribucion-comisiones/[id]/…`) para favoritos y enlaces antiguos; el listado de configuración de producto ya no usa ese camino como acción principal hacia la distribución.

### Documentación / Interno

- **Base de datos:** Migración Prisma que asegura **código obligatorio y único** en cada configuración de producto. En cada entorno hay que aplicar **`prisma migrate deploy`** (ver runbook del proyecto si hubo estados intermedios de despliegue).
- **API:** Documentado `GET /api/product-configurations/by-code/[code]` para resolución por código exacto.
- **OpenSpec:** Requisitos RF-06 / RF-07 integrados en los specs principales (`product-configuration`, `navigation`, `commission-distribution-ui`); cambio OpenSpec correspondiente archivado.
- **Pruebas:** Scripts de Vitest unificados con la bandera `--run` en los comandos `npm` de test; limpieza menor en mocks de integración.

## [1.0.0-beta.3] - 2026-04-12

### Añadido

- **Distribución de comisiones – Cartera por regla:** Cada regla puede indicar si aplica **cartera**. Si está activa, verás un **porcentaje de cartera** por línea de categoría, con validación de rango **1 %–100 %** y **suma máxima 100 %** entre líneas, independiente de la suma de distribución.
- **Persistencia al desactivar cartera:** Si quitas la marca de cartera y guardas, los porcentajes de cartera guardados **no se borran**; vuelven a mostrarse cuando vuelves a activar la opción.
- **Tabla de reglas – Columna Cartera:** Cuando al menos una regla usa cartera, el listado muestra la columna **Cartera** con el mismo criterio de formato que el resto de porcentajes en lectura.

### Mejorado

- **Validación al salir del campo (RF-02):** En porcentajes de **distribución** y, si la cartera está visible, en **cartera**, los errores por valor vacío o fuera de rango pueden mostrarse al **perder el foco**, sin depender solo del botón guardar.
- **Lista de reglas:** Un solo **buscador** integrado en la tabla (menos controles duplicados en la página).
- **Formulario de regla:** El interruptor de cartera queda dentro del bloque de categorías; el pie de totales **alinea** columnas de porcentaje y cartera con las filas.
- **Porcentajes en lectura:** Presentación más limpia, evitando ceros decimales finales innecesarios cuando el valor es entero o ya está redondeado de forma natural.

### Documentación / Interno

- **Prisma:** Migración para `hasPortfolio` en configuración producto–categoría; ampliación de decimales en porcentajes por categoría; seeds ajustados para que las fracciones sumen coherencia con la UI.
- **API:** Documentación y contratos de creación/edición de reglas con cartera y fusión en servidor al desactivar el flag.
- **OpenSpec:** Cambio `explore-rf-03-hasportfolio` archivado; spec principal `commission-distribution-ui` actualizada (RF-03, RF-04, cartera).

## [1.0.0-beta.2] - 2026-04-10

### Añadido

- **Distribución de comisiones – Campo de porcentaje dedicado:** Al editar categorías en una regla, el porcentaje usa un control con el símbolo **%** como adorno (no mezclado con el número), entrada tipo texto con teclado decimal, y **pegado normalizado** para formatos como `12,5 %` o `12.5%` según el locale de la aplicación. Mientras escribes se permiten hasta **cuatro** decimales; si borras todo el campo, **no** se fuerza el valor a cero antes de validar.
- **Porcentajes en lectura unificados:** Las vistas que muestran porcentajes de distribución (tabla de reglas, totales del formulario, **pre-liquidación** vía `formatPct`, **histórico de liquidaciones**) comparten la misma regla de presentación: separadores según locale, precisión coherente con el valor del servidor (sin redondeo caprichoso en cliente) y entero mostrado con relleno de decimales en pantalla según RF-01.

### Mejorado

- **Distribución de comisiones – Validación RF-05:** Cada línea de categoría exige un porcentaje entre **1 % y 100 %**; la **suma** de todas las líneas no puede superar **100 %**. Los errores son explícitos en el formulario, con indicación en vivo cuando el total se excede y mensajes al intentar guardar si algo falla.
- **Distribución de comisiones – Precisión al cargar reglas:** El mapeo desde Prisma usa aritmética **Decimal** al pasar de fracción al modelo de dominio (0–100), evitando la pérdida de precisión que imponía un redondeo fijo a dos decimales.
- **Distribución de comisiones – Formulario y edición:** Errores de campo más visibles (estilo destructivo, icono, `role="alert"` donde aplica, `aria-invalid` en select y campo de porcentaje); filas de categoría con separación y altura consistentes; página **editar regla** sin título duplicado; skeleton alineado al formulario sin columna “Activo” en el flujo de lista.

### Documentación / Interno

- **PRDs:** Documentos de requisitos de producto para configuración de comisiones y tema MAPA (UX / configuración producto-comisión) en `PRDs/`.
- **OpenSpec:** Change `rf-01-presentacion-porcentajes` con propuesta, diseño, tareas, especificaciones delta (`ui-system`, `commission-distribution-ui`), exploración e informe de verificación SDD.
- **Repositorio:** Entrada en `.gitignore` para la carpeta `.atl/` (artefactos locales de agentes).

## [1.0.0-beta.1] - 2026-04-05

### Añadido

- **Pre-liquidación – Comisión tras descuento (impuesto):** El sistema guarda el monto de comisión distribuida **después** del descuento fiscal y calcula el clawback sobre esa base. En el modal de detalle de distribución verás la columna **Com. Dist. con descuento** y totales coherentes con cada fila.
- **Negocios – Edición de contrato:** Al abrir **Editar**, los datos del negocio se obtienen de forma estable desde el servidor (API y capa de datos dedicada), reduciendo desfases respecto al listado.

### Mejorado

- **Carga de archivos – Números en Excel:** Lectura y validación de importes más tolerantes a formatos regionales y separadores decimales, con reglas documentadas en OpenSpec.
- **UI – Tablas con totales:** El pie de totales del `DataTable` comparte la misma tabla que el cuerpo, alineando columnas e importes (por ejemplo en modales con desglose).

### Documentación / Interno

- **Base de datos:** Migración Prisma para `value_commission_with_discount` en distribuciones de comisión.
- **API y especificaciones:** Ajustes en `AGENTS.md`, modo de artefactos SDD Engram en OpenSpec y ampliación del spec de carga de archivos.
- **Pruebas:** Cobertura ampliada en pre-liquidación (helper de montos, servicio, modal), negocios (edición, API), roles y ruta de distribución.

## [1.0.0-beta.0] - 2026-03-31

Primera versión **beta** pública del ciclo 1.x: refuerza la pre-liquidación, la liquidación parcial y el estado de negocio **Comisionando**.

### Añadido

- **Pre-liquidación – Liquidar de extremo a extremo:** Al confirmar la liquidación, el sistema actualiza en una sola operación las comisiones y sus distribuciones, aplica retenciones tipo póliza (clawback) cuando corresponde, actualiza saldos de clawback por usuario y deja trazabilidad coherente con la liquidación real.
- **Pre-liquidación – Rezagar con trazabilidad de usuario:** El rezago registra que la acción fue iniciada por el operador (`isLagByUser` y fecha asociada), además del estado rezagado y la marca de rezago ya existentes.
- **Negocios – Estado Comisionando:** Nuevo estado de negocio tras liquidar desde pre-liquidación cuando el negocio estaba **Emitido**; visible en tipos, validación de API y badge en la interfaz.
- **Pre-liquidación – Archivo completado solo cuando la cola está vacía:** Un archivo pasa a **Completado** únicamente cuando no quedan comisiones pendientes de sincronizar **ni** en cola de pre-liquidación, evitando cerrar el archivo mientras aún hay registros por liquidar.

### Mejorado

- **Negocios – Lista principal:** Las filas en estado **Comisionando** ya no se muestran por error como canceladas; el badge usa el estilo azul acorde al resto del producto.
- **Pre-liquidación – Detalle sin registros:** Si el archivo no tiene comisiones pre-liquidadas, se ofrece un acceso directo a **Liquidaciones** para continuar el flujo operativo.

### Corregido

- **Modales compartidos:** Ajustes de accesibilidad y comportamiento del modal base usado en confirmaciones de liquidar y rezagar (enfoque y cierre coherentes).

### Documentación / Interno

- **Prisma:** Migración para campos de rezago por usuario en comisiones de liquidación; diagrama **ERD** alineado con el schema actual.
- **OpenSpec:** Requisitos de pre-liquidación y negocios incorporados al catálogo principal; change `liquidar-rezagar-preliquidacion` archivado con informe de verificación.
- **Pruebas:** Cobertura ampliada en servicio de pre-liquidación, rutas API de liquidar/rezagar y badge de estado en negocios.

## [0.2.9] - 2026-03-31

### Añadido

- **Administración – Maestro de Categorías:** Implementación completa del CRUD para categorías desde el dashboard administrativo. Incluye soporte para el nuevo modelo de beneficiario fijo (`FIXED_BENEFICIARY`) y configuración de productos vinculada.
- **Administración – Maestro de Orígenes:** Nueva sección para gestionar orígenes de póliza (`ClientOrigin`), permitiendo crear, editar y listar orígenes de clientes de forma independiente en `/dashboard/admin/origins`.
- **UI – DataTable Premium:** Rediseño y mejora del componente de tablas compartidas, con soporte nativo para filtros de tipo Combobox, estados de carga (Skeleton) y diseño optimizado para interfaces administrativas.
- **Categorías – API de Tipos:** Nuevo endpoint para consultar tipos de categorías disponibles, facilitando la integración con formularios dinámicos.

### Mejorado

- **Calidad de Código – Tipado estricto:** Eliminación completa de `any` en servicios críticos como `pre-liquidacion.service.ts` y componentes de tablas, asegurando la integridad de los datos mediante interfaces reales de Prisma y TypeScript.
- **Linting – Resolución de advertencias:** Limpieza exhaustiva de ~25 problemas de ESLint en múltiples features, incluyendo imports duplicados, dependencias de hooks faltantes y variables no utilizadas.

### Interno

- **Pruebas:** Sincronización de mocks y fixtures para categorías, alineando las pruebas unitarias con los nuevos esquemas de validación Zod.
- **Infraestructura:** Actualización de seeds para incluir orígenes por defecto y categorías base.

## [0.2.8] - 2026-03-29

### Añadido

- **Carga de archivos – Pestañas "Archivos" e "Historial":** La pantalla de carga divide el listado en dos contextos: archivos en proceso (`LOAD` / `PRE-SETTLED`) en "Archivos" y cargas finalizadas (`COMPLETED`) en "Historial", cada uno con su propio filtro de estados en el servidor.
- **Carga de archivos – Tarjetas y badges de estado:** Cada fila usa componentes dedicados con etiquetas y colores claros; los estados "Sincronizado" y "Pre-liquidado" se distinguen bien entre sí.
- **Carga de archivos – API multi-estado:** El listado puede consultarse con varios estados a la vez (`status` como lista separada por comas), manteniendo compatibilidad con un solo valor.

### Mejorado

- **Carga de archivos – Historial:** Navegación interna con el enrutador de la app (sin recargar la página completa), textos de botones más claros (por ejemplo "Ir a Pre-liquidación", "Cargar otro archivo") y mejor contraste en acciones como eliminar.
- **Carga de archivos – Errores de red:** Si el historial recibe una respuesta que no es JSON (por ejemplo una página de error HTML), se muestra un mensaje entendible en lugar de un error técnico de parseo.

### Documentación / Interno

- OpenSpec: especificación `carga-archivos` en el catálogo principal y archivo del change `file-sync-ux-improvement` con informe de verificación.

## [0.2.7] - 2026-03-28

### Añadido

- **Liquidaciones – Histórico:** Vista de histórico de liquidaciones con filtros por mes o rango de fechas y desglose por comisión liquidada (integración desde historial de desarrollo).
- **Pre-liquidación – Beneficiario por categoría:** Resolución de beneficiario según `beneficiaryMode` de la categoría (`UPLINE_CHAIN` o `FIXED_BENEFICIARY`), persistencia de `idBeneficiaryUser` en distribuciones, alineación de clawback con el beneficiario de la fila y respuesta con `registrosConError` cuando falla la configuración.
- **Pre-liquidación – Errores de configuración en UI:** Modal que lista registros omitidos tras preliquidar, con código de categoría y motivo.
- **Categorías – Modo beneficiario:** Formulario y API de categorías permiten fijar modo de beneficiario y usuario fijo cuando aplica; validación cruzada en esquemas Zod.
- **OpenSpec – Especificaciones:** Nuevo spec principal `categories` y actualización de `pre-liquidación` (archivado el cambio `preliquidacion-beneficiario-categoria-clawback`).

### Corregido

- **Pre-liquidación – Modal de distribución:** Textos de resumen y tabla alineados con comisión (`Valor Comisión`, `Com. Dist.`).

### Interno

- Integración de rama `develop` (liquidaciones, seeds, migraciones Prisma, ajustes de comisión y UI).
- Eliminación de helpers no usados en el plugin OpenCode `background-agents`.
- Pruebas unitarias alineadas con códigos de error del resolvedor y etiquetas de acciones en tabla de registros.

## [0.2.6] - 2026-03-24

### Añadido

- **Negocios – Cambio de origen con reliquidación:** Implementado aviso de confirmación al cambiar el origen del cliente en negocios con estado `EMITIDO`. Al confirmar, el sistema reliquida atómicamente todas las comisiones asociadas en estado `PRE-SETTLED`, aplicando la nueva configuración de porcentajes del origen seleccionado.
- **Pre-liquidación – Estandarización de cálculos:** El motor de cálculo ahora utiliza `commissionValue` como fuente única de verdad para la base de comisión bruta, garantizando consistencia entre la UI y los registros de base de datos.
- **Pre-liquidación – Desglose de distribución mejorado:** El modal de detalle ahora incluye la "Comisión Total" en la cabecera y muestra las columnas descriptivas de "% Dist. de Comisión" y desglose de descuentos de forma organizada.

### Corregido

- **Pre-liquidación – Integridad de cálculos:** Se corrigió la lógica de descuentos para que el Clawback se reste de forma independiente de los descuentos de comisión distribuidos, asegurando que la comisión final sea exacta (`Bruta - Descuento - Clawback`).
- **Infraestructura – Certificados SSL (servidor):** El script `setup-ssl.sh` ya no usa un flag de Certbot no soportado en versiones 1.x de los droplets, de modo que la emisión inicial del certificado Let's Encrypt vuelve a completarse sin error.

### Interno

- **Despliegue – Scripts SSL:** Los workflows de QA y producción copian al servidor `setup-ssl.sh` junto con `ssl-renew.sh` y dejan ambos ejecutables, alineado con la renovación automática por cron.
- **Documentación – Dominio y SSL:** En la guía de dominio y HTTPS se documentó cómo subir `setup-ssl.sh` manualmente cuando el servidor aún no lo tiene tras un deploy antiguo.
- **Pruebas:** Restaurada la suite técnica con 100% de éxito (1441 tests), incluyendo nuevos casos para reliquidación atómica y validación de tipos estrictos en mocks.
- **Arquitectura:** Archivados artefactos SDD del cambio `recalculate-commission-origin-change` y sincronización de especificaciones en `openspec/`.

## [0.2.5] - 2026-03-21

### Añadido

- **Pre-liquidación – Modal de distribución de comisión:** Desde la tabla de registros pre-liquidados, cada fila tiene un botón "Detalle de Distribución" que abre un modal con el desglose completo por usuario: comisión bruta, descuentos, porcentaje de clawback, tipo de retención y comisión final (en negrita).

## [0.2.4] - 2026-03-17

### Corregido

- **Pre-liquidación – Archivos PRE-SETTLED ahora visibles en el módulo:** Los archivos que ya fueron pre-liquidados ahora aparecen correctamente en la vista principal del módulo de Pre-liquidación, sin necesidad de navegar a otra pestaña.
- **Pre-liquidación – Estado del archivo actualizado correctamente:** Al ejecutar la pre-liquidación, el archivo queda marcado como `PRE-SETTLED` de forma inmediata e incondicional, eliminando casos en que el estado quedaba en `LOAD` sin reflejar el procesamiento realizado.
- **Carga de archivos – Bloqueo de sincronización global por período pre-liquidado:** Si un período ya fue pre-liquidado por cualquier usuario, ningún otro usuario puede sincronizar registros en ese mismo período. El sistema retorna 409 para todos los intentos sobre períodos en estado `PRE-SETTLED`.
- **Pre-liquidación – Botón "IR a PRELIQUIDACIÓN" navega al archivo correcto:** El botón en el historial de carga ahora redirige directamente al detalle del archivo pre-liquidado en lugar de la página principal del módulo.
- **Pre-liquidación – Etiqueta de estado corregida:** El badge del estado pre-liquidado ahora muestra `Pre-liquidado` en lugar de `PRE-LIQUIDADO`.

### Mejorado

- **Pre-liquidación – Vista simplificada:** Se eliminó la pestaña "Histórico". Los archivos pre-liquidados se muestran directamente en la vista principal del módulo.

## [0.2.3] - 2026-03-17

### Añadido

- **Pre-liquidación – Botón "Preliquidar" en sincronización:** Los usuarios con rol Administrador o Asistente Operativo de Gerencia ahora pueden iniciar el proceso de pre-liquidación directamente desde el historial de archivos sincronizados, sin necesidad de ir al módulo de pre-liquidación.
- **Pre-liquidación – Listado de comisiones PRE-SETTLED:** La página de detalle de pre-liquidación muestra ahora únicamente las comisiones en estado pre-liquidado, permitiendo validar los cálculos de distribución comisional por archivo.
- **Pre-liquidación – Ruta de consulta de registros pre-liquidados:** Nueva ruta `GET /api/pre-liquidacion/pre-settled/[fileId]` que retorna las comisiones pre-liquidadas de un archivo específico.

### Mejorado

- **Pre-liquidación – Tab "Pre-liquidar" muestra solo archivos pre-liquidados:** El listado filtra únicamente archivos que ya tienen registros en estado PRE-SETTLED, eliminando la confusión con archivos pendientes de sincronización.
- **Pre-liquidación – Indicadores actualizados:** El stat "Total Registros" refleja el conteo de registros pre-liquidados; se eliminó la tarjeta "Sincronizados" y el botón "Limpiar" para simplificar la interfaz.
- **Pre-liquidación – Columna "Cantidad de Registros":** Ahora muestra el número de registros en estado PRE-SETTLED por archivo.
- **Seguridad – Control de acceso en pre-liquidación:** El endpoint de procesamiento de pre-liquidación ahora valida que el usuario tenga los permisos correspondientes (ADMIN o ASISTENTE_GERENCIA_OPERATIVA), retornando 403 para roles no autorizados.

## [0.2.2] - 2026-03-16

### Añadido

- **Carga de archivos – Control por período:** Cada importación queda asociada a un mes y año. El sistema reutiliza la importación existente si ya hay una en estado LOAD para el mismo período, y bloquea la sincronización si el período ya fue liquidado (COMPLETED).
- **Carga de archivos – Nombres estandarizados:** Los archivos ahora siguen el formato `SINCRONIZACION-TIPO-MES-AÑO` (ej. `SINCRONIZACION-POLIZA-MARZO-2026`) para facilitar su identificación.
- **Carga de archivos – Resolución de errores en re-sincronización:** Al volver a sincronizar un archivo, los registros que anteriormente fallaron y ahora se procesan correctamente quedan marcados como resueltos en el historial de errores.
- **Carga de archivos – Filtros de historial por período:** Los filtros de fecha fueron reemplazados por selectores de Mes y Año para buscar directamente por período de sincronización.

### Mejorado

- **Carga de archivos – Resumen de sincronización por sesión:** El resumen de contadores (Sincronizados, Errores, No sincronizados, Rezagados) que se muestra al finalizar una carga ahora refleja únicamente los registros procesados en esa sesión, no el acumulado histórico del archivo.
- **Carga de archivos – Historial filtrado por defecto:** El historial muestra únicamente archivos en estado Cargado (LOAD) y Completado (COMPLETED), ocultando estados intermedios de procesamiento.
- **Carga de archivos – Indicadores contextuales:** Se añadió una nota en el resumen de sincronización aclarando que los contadores corresponden a la sesión actual, y una nota en el historial indicando que los valores son el acumulado de todas las sincronizaciones del archivo.

### Corregido

- **Carga de archivos – Contadores acumulados en resumen:** Al terminar la sincronización, los contadores mostraban el total histórico del archivo en lugar de los registros de la sesión actual.

## [0.2.1] - 2026-03-11

### Añadido

- **Administrador:** Integradas documentación y directrices estructuradas para orquestador SDD, y se mejoró la visibilidad del modelo de archivos en el área de administración.
- **Pre-liquidación:** La creación histórica del desglose de _Clawback_ fue condicionado al flujo de la comisión, refinando la trazabilidad.

### Mejorado / Refactorizado

- **Pre-liquidación:** Extracción completa de las operaciones al balance del asesor (`ClawbackBalance`) durante la pre-liquidación; estas actualizaciones ahora quedarán delegadas exclusivamente al paso de liquidación para prevenir desincronizaciones de saldos totales.

## [0.2.0] - 2026-03-10

### Añadido

- **Administración – Descuentos de comisión:** Nueva sección en Administración para gestionar descuentos de impuesto y clawback. Permite crear descuentos (nombre, tipo, porcentaje), ver listado con estado activo/inactivo, inactivar descuentos y consultar KPIs del impuesto y clawback activos. Los datos se persisten en la base de datos y se auditan las creaciones.
- **Carga de archivos – Lectura UTF-8 y eliminación:** Lectura de archivos CSV en UTF-8, búsqueda sin sensibilidad a acentos en pruebas y flujo de eliminación de importaciones (LOAD/ERROR) con pruebas asociadas.
- **Carga de archivos – Vista por estado ampliada:** Eliminación de archivos en historial cuando el estado es LOAD o ERROR; vista por estado con pestañas (Sincronizados, Errores, No sincronizados, Rezagados) y tablas paginadas; botón "Ver detalle" con modal a pantalla completa.
- **Documentación – Reglas de arquitectura:** Reglas siempre aplicadas: las rutas API no deben llamar Prisma (solo servicios de features) y los hooks con llamadas asíncronas deben usar el tipo `AsyncState<T>` del módulo compartido.

### Mejorado

- **Carga de archivos – Vista por estado:** Estabilidad de dependencias en la vista por estado (useMemo) para evitar re-renderizados innecesarios; porcentaje de clawback para Póliza tomado desde la configuración cuando el plan no es CLAW.
- **Carga de archivos – UI de resumen:** Tarjetas de resumen (Sincronizados, Errores, No sincronizados, Rezagados) con colores sólidos e iconos Lucide; formato requerido indicado por separado para Voluntaria y Póliza.
- **Descuentos – Carga de datos:** La API de descuentos serializa correctamente porcentajes y fechas para el cliente; la página de administración muestra un mensaje de error claro cuando falla la carga en lugar de una tabla vacía.

### Corregido

- **Descuentos:** Los datos de descuentos no cargaban en la página de administración por la serialización de tipos Prisma (Decimal, Date); corregido mapeando la respuesta a objetos planos.
- **Vista por estado (carga de archivos):** Advertencia de ESLint por dependencias del `useEffect` resuelta; variable no utilizada eliminada.

### Documentación / Interno

- OpenSpec: change admin-discount (diseño, propuesta, tareas, specs), archivado de changes 005-fix-preliquidation-visibility, refactor-load-file-v2 y unify-admin-domain-logic; specs de commission-discounts, pre-liquidación, unified-entity-management y actualización de load-file-v2.
- SDD/CLAUDE y .cursorrules con directrices del orquestador Spec-Driven Development.
- Pruebas unitarias para descuentos (schemas, servicio, hooks), API inactivate y rutas de descuentos.

## [0.1.0]

### Añadido

- **Carga de archivos – Eliminación en historial:** Se puede eliminar un archivo del historial cuando está en estado **LOAD** o **ERROR**. Los archivos pre-liquidados o liquidados no se pueden eliminar y se muestra un mensaje claro.
- **Carga de archivos – Vista por estado:** Tras cargar un archivo y en el historial se muestran cuatro resúmenes (Sincronizados, Errores, No sincronizados, Rezagados) con pestañas y tablas. Los registros se obtienen con paginación desde el servidor.
- **Carga de archivos – Detalle en historial:** En historial, el botón "Ver detalle" abre un modal a pantalla completa con la misma vista por estado (cuatro cards y cuatro pestañas con tablas).
- **Carga de archivos – Formato requerido:** En la sección de formato requerido de Skandia se indican por separado las columnas para archivos **Voluntaria** y **Póliza**.

### Mejorado

- **Carga de archivos – Consistencia de conteos:** El número de "No sincronizados" que se muestra justo después de subir el archivo coincide con el que aparece en el historial (se usa el valor guardado en el backend).
- **Carga de archivos – Eliminación con errores relacionados:** La eliminación de un archivo del historial funciona correctamente aunque el archivo tenga registros de error asociados; se eliminan primero las dependencias en el orden adecuado.

### Corregido

- Eliminación de archivos en historial cuando el estado era ERROR: ahora se permite eliminar tanto en LOAD como en ERROR.

### Documentación / Interno

- OpenSpec y plan del change refactor-load-file-v2 actualizados (diseño, tareas, especificaciones).
- Pruebas unitarias ampliadas para proceso por lotes (Voluntaria, Póliza, FileImportError, integridad) y validación de estructura Excel.
- Documento de QA para load-file-v2 (`docs/qa-load-file-v2.md`).
