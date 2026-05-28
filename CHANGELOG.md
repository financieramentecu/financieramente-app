# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.18.0] - 2026-05-28

### Nuevo

- **Gráfica de dona "Origen del cliente":** El dashboard incluye una nueva gráfica de dona que muestra la distribución de los negocios del scope jerárquico agrupados por tipo de origen del cliente (Método Vortex, Propio, Asesoría Gratuita, KAM/Influencer, etc.) y por moneda. Cada origen recibe un color identificador consistente; los negocios en moneda extranjera aparecen con el tono sólido y los de moneda local con una variante más clara del mismo color.

- **Desglose por moneda en el origen:** Cada tipo de origen puede mostrar hasta dos segmentos: uno para negocios en **USD** y otro para negocios en **COP**. La leyenda lateral lista cada combinación con su porcentaje (ej. *Método Vortex USD · 30%* / *Método Vortex COP · 16.7%*).

- **Tooltip con equivalencia monetaria:** Al posicionarse sobre un segmento, aparece un tooltip con la cantidad de negocios, el porcentaje y el monto total. Los segmentos en USD muestran el valor directamente en dólares. Los segmentos en COP muestran el equivalente en USD (calculado con la TRM vigente) y el monto original en pesos como referencia.

- **Integración con árbol y filtros:** La gráfica respeta el scope jerárquico activo y todos los filtros del dashboard (compañía, categoría, rango de fechas, origen, etc.). Al marcar o desmarcar nodos en el árbol o cambiar cualquier filtro, los porcentajes y conteos se recalculan automáticamente.

## [1.17.0] - 2026-05-28

### Nuevo

- **Tabla heatmap de producción por compañía:** El dashboard incluye una nueva tabla que muestra la producción de cada Money Strategist del scope jerárquico desglosada por compañía. Cada compañía aparece con dos columnas: el monto total en **USD** con intensidad de color según el volumen (a mayor producción, fondo más oscuro) y la cantidad de **negocios**. Para producción en moneda local, la celda también muestra el equivalente en **COP** debajo del valor en USD. El texto de celdas oscuras cambia a blanco automáticamente para mantener la legibilidad.

- **Agrupación jerárquica en la tabla:** Las filas se agrupan por nivel (Team Leader, MS Senior, MS Junior, etc.) con un separador de sección que identifica cada grupo por su color de nivel. Un botón en el encabezado de la columna **Money Strategist** permite invertir el orden jerárquico (de mayor a menor rango y viceversa).

- **Buscador en el árbol de jerarquía:** El panel izquierdo del dashboard incluye un campo de búsqueda para filtrar personas en el árbol. Los resultados se muestran en lista plana con el nombre resaltado, el avatar de iniciales y el nivel de cada persona; hacer clic en un resultado activa o desactiva esa persona directamente.

- **Colapso del panel de jerarquía:** Un nuevo botón en el encabezado del árbol permite colapsar o expandir el panel lateral izquierdo para ganar espacio en la vista principal. El panel se anima suavemente al abrirse o cerrarse.

### Mejorado

- **Diseño del panel Venta Total:** El bloque de KPIs en USD ahora tiene fondo verde oscuro (#003c45) —el mismo color del menú principal— con texto blanco y tarjetas translúcidas. El indicador de TRM automática muestra un punto pulsante animado que señala que el valor es en tiempo real. El formulario de TRM manual solo aparece cuando la consulta automática falla, no durante la carga inicial.

- **Gráfica de barras ordenada por producción:** Las barras de la gráfica por Money Strategist ahora se ordenan de mayor a menor producción total en USD, facilitando identificar quién lidera el período.

- **Árbol de jerarquía sin niveles beneficiarios:** Los usuarios con nivel de tipo `BENEFICIARIO_GENERAL` ya no aparecen en el árbol del dashboard, evitando confusión con los niveles comerciales activos.

### Corregido

- **Actualización de niveles en administración:** Se corrigió un error que impedía guardar cambios en la configuración de un nivel cuando se modificaba el beneficiario fijo o el nivel siguiente. Prisma rechazaba los campos por nombres incorrectos; ahora se usan los campos correctos de la API de relaciones.

## [1.16.0] - 2026-05-27

### Nuevo

- **Gráfica de producción por Money Strategist:** El dashboard incluye una gráfica de barras agrupadas que compara, para cada persona visible en el árbol jerárquico, la producción en **moneda extranjera (USD)** frente a la producción **nacional convertida a USD** con la TRM vigente. Cada agente aparece con dos barras (azul y verde); al pasar el cursor se muestra el monto y la cantidad de negocios del período y filtros aplicados.

- **Comparación visual por equipo:** Los grupos se ordenan según la jerarquía activa (el usuario autenticado primero, luego su equipo). Al marcar o desmarcar nodos en el árbol, o al aplicar filtros de fechas y catálogos, la gráfica se actualiza con los mismos criterios que el panel de KPIs. Si hay muchos agentes, la gráfica permite desplazamiento horizontal para revisar todos los nombres.

### Mejorado

- **TRM compartida entre KPIs y gráfica:** La tasa de cambio se consulta una sola vez al cargar el dashboard y alimenta tanto las tarjetas de KPIs como la conversión de la barra nacional en la gráfica. Si la consulta automática falla, la TRM manual ingresada en el panel general sigue recalculando ambas vistas.

- **Estado vacío en la gráfica:** Cuando no hay producción para la combinación de árbol y filtros seleccionados, se muestra el mensaje *Sin producción registrada para los filtros aplicados* en lugar de una gráfica vacía confusa.

## [1.15.0] - 2026-05-27

### Nuevo

- **Panel de KPIs en USD con TRM automática:** El dashboard de producción ahora muestra tres tarjetas de métricas en dólares: **Detalle Internacional** (negocios en USD), **Nacional convertido a USD** (total COP dividido por la TRM) y **Total USD** (suma de ambos). La TRM del día se consulta automáticamente al Banco de la República; si la consulta falla, se puede ingresar la TRM manualmente para recalcular los valores al instante. El valor en COP equivalente aparece debajo del monto en USD en la tarjeta Nacional para facilitar la comparativa.

- **Período activo visible en el panel:** El encabezado del panel de ventas muestra el rango de fechas que está aplicado actualmente, así siempre es claro qué período representan los números.

### Mejorado

- **Skeletons de carga en las tarjetas:** Mientras los datos se están cargando (al entrar al dashboard o al aplicar filtros), las tarjetas muestran un indicador animado en lugar de mostrar brevemente valores en cero, evitando lecturas erróneas durante la transición.

## [1.14.0] - 2026-05-27

### Nuevo

- **Panel de filtros del dashboard:** El dashboard de producción ahora incluye un panel de filtros completo con 8 controles: rango de fechas (selección por día), estado del negocio, categoría, compañía, producto, origen, plazo y periodicidad. Los cambios en los filtros no se aplican hasta que el usuario confirma con el botón **Aplicar**, preservando los datos visibles mientras se ajusta la selección.

- **Filtros de compañía y producto con búsqueda:** Los selectores de compañía y producto incluyen campo de búsqueda para encontrar opciones rápidamente en listas largas. Al seleccionar una compañía, el listado de productos se reduce automáticamente a los productos de esa compañía.

- **Catálogo de periodicidad desde la base de datos:** Las opciones de periodicidad (Mensual, Trimestral, Anual, etc.) se cargan directamente desde la tabla de datos, de modo que cualquier periodicidad configurada en el sistema aparece automáticamente en el filtro sin cambios de código.

### Mejorado

- **Árbol jerárquico con resaltado por categoría:** Al aplicar un filtro de categoría, los nodos del árbol que no pertenecen a esa categoría se atenúan visualmente, facilitando identificar qué usuarios contribuyen a los resultados filtrados.

- **Navegación más compacta:** Se eliminó el elemento "Inicio" del breadcrumb para ganar espacio vertical. El panel de filtros también se redujo en altura (padding y tamaño de fuente optimizados) para mostrar más contenido útil en pantalla.

- **Skeleton de jerarquía visible:** El indicador de carga del árbol jerárquico ahora muestra el gris estándar del sistema en lugar de un color casi invisible.

## [1.13.0] - 2026-05-26

### Nuevo

- **Dashboard de producción — Árbol jerárquico:** Nuevo panel lateral en el dashboard que muestra la estructura organizacional del equipo. Cada usuario aparece con su nombre, categoría y color de nivel. Los nodos se pueden marcar o desmarcar para filtrar los datos del dashboard; al desmarcar un líder, sus subordinados también se excluyen del filtro. Solo se listan usuarios con nivel asignado.

- **Activación gradual del dashboard:** El módulo de dashboard de producción se controla con el feature flag `production_dashboard` en Flagsmith, permitiendo habilitarlo por usuario o por entorno sin un nuevo deploy. Cuando el flag está desactivado, la opción de menú no aparece y el acceso directo a `/dashboard` redirige a Negocios.

### Mejorado

- **Redirección después del login:** Todos los usuarios ingresan por defecto a **Negocios** (`/dashboard/negocios`) en lugar del dashboard de producción, simplificando el flujo de entrada habitual.

- **Feature flags por identidad:** Flagsmith evalúa los flags por correo del usuario autenticado, de modo que las pruebas en QA y desarrollo reflejan los overrides configurados por persona.

## [1.12.0] - 2026-05-27

### Nuevo

- **Fondear el primer pago:** Administradores y Analistas de Soporte ahora pueden registrar el fondeo del primer aporte directamente desde el modal de aportes. Al hacer clic en "Fondear", se ingresa la fecha de fondeo y el sistema cambia el estado del negocio de **Emitido** a **Fondeado** de forma automática y atómica. Si el primer aporte estaba en cartera y el cliente lo pagó, el negocio también transiciona a Fondeado al registrar el pago de cartera.

- **Fechas en zona horaria de Bogotá:** Todas las fechas del sistema (modal de aportes y tabla de negocios) ahora se muestran correctamente en hora Colombia (UTC-5), eliminando el desfase de un día que aparecía en ciertos casos.

### Infraestructura

- **Llaves Flagsmith por entorno:** Se configuraron las claves de servidor de Flagsmith para los entornos de QA y Producción, completando la integración de feature flags iniciada en 1.10.0.

## [1.11.0] - 2026-05-24

### Nuevo

- **Cartera pagada:** Cuando un cliente paga una deuda en cartera, el sistema ahora registra el pago como **Cartera Pagada** — un estado definitivo que deja constancia permanente del cobro. Ya no es posible revertir un aporte pagado, garantizando la trazabilidad del ciclo de cobro completo.

- **Confirmación con fecha de pago:** Al marcar un aporte como pagado desde cartera, se muestra un diálogo de confirmación donde el analista ingresa la fecha exacta en que el cliente realizó el pago. Esa fecha queda registrada y visible en el detalle del aporte.

### Corregido

- **Fecha de cartera mostraba un día menos:** Las fechas de aportes en estado Cartera, Pago Anticipado y Cartera Pagada se mostraban con un día de desfase (por ejemplo, 24 de mayo aparecía como 23 de mayo). Corregido para todos los estados del modal de fondeo.

## [1.10.0] - 2026-05-23

### Infraestructura

- **Gestión de funcionalidades por entorno (Feature Flags):** Se integró Flagsmith como plataforma de feature flags. Esto permite habilitar o deshabilitar funcionalidades de forma remota por entorno (QA / Producción) sin necesidad de un nuevo deploy. Las nuevas funcionalidades de alto impacto se irán lanzando bajo flags de manera progresiva.

- **Política de seguridad de contenido ampliada:** Se reforzó la cabecera `Content-Security-Policy` del servidor para incluir directivas `frame-src` y `object-src`, mejorando la protección contra ataques de inyección de contenido embebido.

## [1.9.0] - 2026-05-22

### Nuevo

- **Cédulas y documentos alfanuméricos:** El campo de número de identificación del cliente ahora acepta letras, dígitos, puntos y guiones, eliminando el bloqueo que impedía registrar clientes con Cédula de Extranjería (`CE-123456`), pasaporte (`PE-123456`) u otros documentos con letras. El sistema normaliza automáticamente el número a mayúsculas al guardarlo, garantizando consistencia en la base de datos.

## [1.8.1] - 2026-05-22

### Nuevo

- **Buscador en filtros avanzados:** Se agregaron campos de texto en el modal de "Filtros Avanzados" para buscar y filtrar en tiempo real las opciones de Compañía, Producto y Origen.
- **Limpiar filtros de búsqueda:** El botón "Limpiar" ahora también reinicia el texto ingresado en los buscadores.

## [1.8.0] - 2026-05-22

### Nuevo

- **Comprobantes en PDF:** Los usuarios ahora pueden subir archivos PDF como comprobantes de pago, además de las imágenes (JPEG, PNG, WebP). El visor de comprobantes muestra los PDF directamente en pantalla con un visor inline, y el botón "Ver original" sigue disponible para abrirlos en una nueva pestaña. Los PDF se identifican visualmente con un ícono de documento en la lista de comprobantes.

## [1.7.0] - 2026-05-22

### Nuevo

- **Estados de Fondeo Avanzados:** El modal de fondeo ahora soporta dos nuevos estados por aporte: **En Cartera** (marcado en rojo cuando un pago está en gestión de cobro) y **Pago Anticipado** (cuando el cliente pagó antes de la fecha proyectada). Analistas de Soporte y Administradores pueden registrar estos estados directamente desde el modal.

- **Ciclo de vida completo del aporte:** Los aportes ahora nacen automáticamente como Fondeados al momento de emitir el negocio, con sus fechas proyectadas por cuota. El color del aporte (verde o gris) se determina comparando la fecha proyectada de cada cuota con el mes actual — sin necesidad de acciones manuales.

- **Reversión de Cartera:** Los analistas pueden revertir un aporte marcado como En Cartera con un clic en "Quitar Cartera", devolviendo el aporte a su estado anterior y registrando el cambio en el log de auditoría.

- **Confirmación obligatoria en transiciones:** Todas las acciones de cambio de estado (marcar Cartera, Pago Anticipado, Quitar Cartera) requieren confirmación explícita del usuario antes de ejecutarse.

- **Control de acceso por rol:** Los botones de acción solo son visibles para Analistas de Soporte y Administradores. Los Agentes/Coach pueden ver el estado de cada aporte pero no realizar cambios.

- **Auditoría completa:** Cada cambio de estado queda registrado automáticamente en el log de auditoría con usuario, IP, fecha y hora.

- **Script de migración de pagos:** Se incluye un script (`prisma/seeds/migrate-payments-to-fondeado.ts`) para migrar pagos existentes en estado SIN_FONDEAR al nuevo modelo FONDEADO.

### Mejorado

- **Diseño del modal de fondeo:** Las filas de aportes son más compactas. Los botones de acción aparecen al pasar el mouse sobre cada fila y llevan íconos descriptivos. Los aportes de meses pasados se muestran en verde reducido para aprovechar mejor el espacio.

- **Recálculo de fechas al cambiar emisión:** Al modificar la fecha de emisión de un negocio, se recalculan automáticamente las fechas proyectadas de todos los aportes en estado Fondeado, respetando los aportes en Cartera o Pago Anticipado.

### Corregido

- **Rendimiento en actualización de negocios:** Se resolvió un error de timeout (P2028) que ocurría al guardar negocios con muchos aportes. Las actualizaciones de fechas ahora se ejecutan fuera de la transacción principal.

- **Mensaje de validación en cambio de rol:** Al intentar guardar un usuario con rol Agente sin categoría asignada, ahora se muestra el mensaje de error específico en lugar del JSON técnico.

## [1.6.4] - 2026-05-21

### Nuevo

- **Recálculo de fechas de fondeo desde Fecha de Emisión:** Se implementó el recálculo dinámico de las fechas esperadas de los aportes basados en la fecha de emisión del negocio y no desde la fecha del primer fondeo. Al registrar o actualizar la fecha de emisión de un negocio en estado emitido (`EMITIDO`), se recalculan automáticamente las fechas de fondeos proyectados.
- **Edición rápida desde la tabla:** Se añadió la opción de editar la fecha de emisión directamente en la tabla principal de negocios a través de una celda de fecha interactiva. El ícono de lápiz de edición está ahora **para siempre visible** para todos los negocios elegibles sin necesidad de hover. El botón está habilitado exclusivamente para negocios en estado emitido (`EMITIDO`).
- **Selector de Fechas Libre:** Se eliminó la restricción de fecha máxima (`max`) tanto en el modal de detalle del negocio como en la celda interactiva de la tabla, permitiendo seleccionar libremente cualquier fecha en el pasado o futuro según las necesidades operativas, eliminando también las validaciones de cliente que impedían el registro de fechas futuras.

### Interno

- **Pruebas y Verificación:** Se crearon y adaptaron suites de pruebas unitarias robustas en el frontend (`business-view-modal.date-issued.test.tsx`) y backend (`route.test.ts`), garantizando el cumplimiento al 100% de los criterios de aceptación sin regresiones.

## [1.6.3] - 2026-05-19

### Nuevo

- **Precarga automática de Periodicidad para SKANDIA + MFUND:** Al seleccionar la compañía Skandia y el producto MFUND en el formulario de creación de negocio, el campo Periodicidad se completa automáticamente con "Aportes Ocasionales". El campo permanece editable: si el agente necesita seleccionar otro valor, el cambio se respeta sin revertirse. En modo edición, el valor guardado en base de datos se preserva tal cual.

## [1.6.2] - 2026-05-15

### Nuevo

- **Filas por página en tabla de negocios:** Se habilitó el selector de "Filas por página" en la tabla de negocios. Los usuarios ahora pueden elegir ver 10, 20, 50 o 100 registros simultáneamente, mejorando la navegación en listados extensos.

### Corregido

- **Alineación de filtros en dashboard:** Se estandarizó la altura (`h-9`) y alineación de todos los controles de filtro (búsqueda, fechas, estados) en el listado de negocios, eliminando desajustes visuales y mejorando la estética premium del dashboard.

- **Sincronización de Prisma (Supports):** Se resolvieron errores de ejecución relacionados con la relación `supports` en el modelo `Business`. Se sincronizaron los tipos de Prisma y el mapeo de entidades para garantizar que el conteo de soportes sea robusto tanto en ejecución como en pruebas.

- **Actualización de negocio fallaba con plazo o aportes en cero:** Al guardar un negocio con plazo `0` (productos Skandia/Mfund) o con `0` aportes, el sistema devolvía "Error al actualizar" de forma silenciosa. La validación del servidor rechazaba valores cero aunque fueran válidos para esos productos.

- **Mensajes de error de validación ahora en español y descriptivos:** Los mensajes que devuelve la API al detectar datos inválidos en la edición de negocios ahora indican claramente qué campo falló y por qué.

## [1.6.1] - 2026-05-15 (Legacy)

## [1.6.0] - 2026-05-14

### Nuevo

- **Soportes de Pago por Negocio:** Los usuarios pueden adjuntar imágenes de comprobantes (JPEG, PNG, WebP) a cada negocio directamente desde la tabla de negocios. Las imágenes se almacenan de forma segura en Digital Ocean Spaces, organizadas por número de contrato.

- **Visor de Comprobantes:** Un panel lateral permite visualizar todos los comprobantes de un negocio con lista de miniaturas a la izquierda y vista previa grande a la derecha. Incluye información del archivo (fecha, tamaño, formato, usuario que subió) y botón para ver el original.

- **Columna "Soporte de Pago":** La tabla de negocios ahora muestra una columna con el estado de comprobantes por negocio: chip verde con la cantidad de soportes subidos, o chip ámbar "Sin soporte" cuando no tiene ninguno.

- **Indicador de Emitidos sin Soporte:** La tarjeta de "Emitidos" en el dashboard ahora muestra cuántos negocios emitidos no tienen comprobante de pago adjunto, facilitando el seguimiento de casos pendientes.

- **Gestión de Acciones por Fila:** Las acciones de cada negocio (Editar, Ver detalle, Eliminar) se agrupan en un menú desplegable "⋮" para liberar espacio. Los íconos de subir y ver comprobantes quedan visibles directamente en la fila.

- **Tarjetas de Estadísticas Compactas:** El panel de KPIs del dashboard ocupa menos espacio vertical y puede ocultarse con un botón para maximizar el espacio de la tabla de negocios.

### Permisos

- **Eliminar comprobantes** está restringido a los roles Administrador, Asistente Operativo de Gerencia y Analista de Soporte.
- Subir y visualizar comprobantes está disponible para todos los roles.
- El botón de subir comprobante solo aparece cuando el negocio tiene estado Emitido o Fondeado y tiene número de contrato asignado.

### Interno

- 1969 pruebas pasando, 0 errores de TypeScript.
- Nueva regla de proyecto: todo el código debe escribirse en inglés (nombres de variables, archivos, comentarios). El español se reserva para cadenas de texto visibles al usuario.
- Variables de entorno `DO_SPACES_*` configuradas en Docker Compose (QA y Prod) y workflows de CI/CD.

## [1.5.1] - 2026-05-13

### Corregido

- **Visibilidad de Negocios – Roles Operativos:** Los usuarios con rol Asistente Operativo de Gerencia y Analista de Soporte ahora pueden ver todos los negocios y estadísticas del sistema, al igual que el Administrador. Antes solo veían los negocios de su propia cadena jerárquica.

- **Estadísticas del Dashboard:** Los indicadores de negocios (Ventas Efectuadas, Emitidos, Fondeados) ahora son visibles para todos los roles. Los datos se filtran automáticamente según lo que cada usuario tiene permitido ver.

- **Selector de Líder en Formulario de Usuario:** Al editar un usuario que ya tiene un líder asignado, el nivel y el nombre del líder ahora se pre-cargan correctamente en los selectores.

- **Migración de Base de Datos – Estabilidad:** Se corrigió una migración que fallaba en ambientes QA y producción al encontrar configuraciones de producto duplicadas. Ahora se depuran automáticamente los duplicados antes de crear el índice único, y todas las operaciones son idempotentes (seguras de re-ejecutar).

### Interno

- 1886 pruebas pasando, 0 errores de TypeScript.
- **Listado de Negocios – Ordenamiento por Columnas:** Se habilitó el ordenamiento funcional en el servidor para las columnas Cliente, Identificación, Contrato, Compañía y Producto. Se eliminó el ordenamiento forzado en el cliente que impedía que la selección del usuario se reflejara correctamente tras la carga de datos.
- **Formulario de Negocio – Limpieza de Etiquetas:** Se eliminaron las etiquetas de depuración "(No editable - Sin Rol)" del campo Money Strategist en el formulario de edición, proporcionando una interfaz más limpia para el usuario.
- **Dashboard – Layout de Filtros:** Se ajustó el espaciado vertical de los filtros en el listado de negocios para evitar recortes visuales en ciertas resoluciones.

### Interno

- **API – Validación de Ordenamiento:** Se actualizaron los esquemas de validación Zod en `business-api.schemas.ts` para soportar las nuevas claves de ordenamiento del servidor.
- **Pruebas Unitarias – Sincronización de Comportamiento:** Se ajustaron las pruebas unitarias del listado de negocios para validar el ordenamiento delegado al servidor en lugar de la lógica de ordenamiento local previa.

## [1.5.0] - 2026-05-13

### Añadido

- **Comisión y Tipo de Aporte por Producto:** Cada producto ahora tiene dos campos nuevos: el porcentaje de comisión que aplica al momento de la liquidación (0–100%) y el tipo de aporte que recibe (`REGULAR` o `UNICO`). Ambos campos están disponibles en el formulario de creación y edición de productos, y se muestran en la tabla de administración.

- **Sincronización de Comisiones desde CSV:** Se incluye un script de seed que lee el archivo `docs/product-percentage-payment-commission.csv` y actualiza automáticamente los productos existentes con sus porcentajes de comisión y tipo de aporte. El proceso reporta en consola los productos que no se encontraron en la base de datos.

### Corregido

- **Carga de Archivos – Contadores de Sincronización:** Se corrigieron los contadores de registros nuevos y duplicados durante la importación de archivos LAG. El sistema ahora detecta correctamente los duplicados por número de carga y evita insertar registros repetidos.

### Interno

- 3 migraciones Prisma: campo `commissionPercentage` (Decimal), enumeración `ContributionType`, renombre de valor `INICIO → UNICO` en la DB.
- 18 pruebas unitarias nuevas (schemas Zod, mapper de Decimal, utilidades del seed).
- 1885 pruebas pasando, 0 errores de TypeScript.

## [1.4.0] - 2026-05-09

### Añadido

- **Jerarquía de Niveles:** Se separó el concepto de jerarquía de comisiones (ahora llamado **Nivel**) del concepto de agrupación de agentes (ahora llamado **Categoría**). Los niveles van de MS Junior (LEVEL_0) hasta Partner (LEVEL_5) más el nivel General para la agencia. Cada nivel tiene su propio color identificador.

- **Distribución de Comisiones por Nivel:** Se cargó la tabla estándar de distribución para todos los productos activos. Cada nivel de configuración (LEVEL_0 al LEVEL_5) tiene su propio plan de porcentajes hacia los niveles superiores de la cadena.

- **Visibilidad Jerárquica de Negocios:** Los líderes ahora pueden ver los negocios de todas las personas a su cargo en la cadena de jerarquía — no solo los directos, sino toda la red hacia abajo. Un LEVEL_4 ve negocios de LEVEL_3, 2, 1 y 0 que estén bajo su liderazgo. El detalle de cada negocio también es accesible para el líder correspondiente.

- **Selector de Líder en Formulario de Usuario:** Al asignar un líder a un usuario, ahora se selecciona primero el nivel del líder y luego se listan solo los usuarios de ese nivel — reemplazando el buscador anterior por un flujo más preciso y guiado.

- **Indicador de Carga en Selectores:** Todos los selectores del formulario de usuario muestran un indicador visual mientras cargan sus opciones.

### Mejorado

- **Tabla de Usuarios:** La columna de nivel ahora muestra un chip coloreado con el color asignado al nivel. La columna de categoría muestra solo el nombre sin decoración adicional.

- **Reglas de Distribución:** El formulario de reglas filtra y muestra solo los niveles relevantes por encima del nivel de configuración del producto, evitando configuraciones inválidas.

- **Terminología:** El término "Agente" fue reemplazado por **"Money Strategist"** en toda la interfaz visible al usuario.

- **Configuración de Productos:** La clave única de configuración cambió de Compañía-Producto-Categoría a Compañía-Producto-Nivel, alineada con la nueva estructura jerárquica.

### Interno

- Migración de base de datos: modelo `Category` renombrado a `Level`; nueva tabla `Category` para agrupación de agentes; tabla de distribución renombrada a `product_percentaje_commision_level`. 6 migraciones Prisma incluidas.
- 1880 pruebas pasando, 0 errores de TypeScript.

## [1.3.3] - 2026-05-08

### Corregido

- **Compañías – Validación de Moneda:** Se flexibilizó la validación del campo `idCurrency` para permitir tanto números como cadenas de texto. Esto resuelve el error "Invalid input" que ocurría al guardar cambios en empresas desde el panel administrativo.
- **Compañías – Feedback de Eliminación:** Se corrigió un error de estado reactivo que impedía que el diálogo de confirmación se cerrara y mostrara el mensaje de éxito tras eliminar una empresa. Ahora la interfaz responde instantáneamente a la acción.

### Añadido

- **Compañías – Edición de Nombre:** Se habilitó la posibilidad de modificar el nombre de la empresa directamente desde el formulario de edición, manteniendo la validación de unicidad en el sistema.

### Interno

- **Pruebas – Cobertura de Validación:** Actualización de la suite de pruebas unitarias para cubrir casos de tipos de moneda mixtos (string/number) y asegurar la estabilidad de los esquemas de Zod.
- **SDD – Documentación de Cambio:** Generación de especificaciones, diseño y reporte de verificación para el ciclo de vida del cambio `fix-company-validation-delete`.

## [1.3.2] - 2026-05-08

### Corregido

- **Interfaz – Selectores con scroll:** Se resolvió un problema de usabilidad en el componente `Select` donde las listas largas de opciones (ej. > 10 ítems) quedaban recortadas y no permitían el desplazamiento. Ahora el componente implementa un scroll nativo con una altura máxima de 320px (`max-h-80`), asegurando que todos los elementos sean accesibles en cualquier resolución.

### Interno

- **Componentes – Refactor de Altura:** Eliminación de restricciones de altura vinculadas dinámicamente al disparador (`trigger-height`) en el `Viewport` de Radix UI para permitir el crecimiento natural del contenido hasta el límite máximo.
- **Pruebas – Validación de UI:** Implementación de suite de pruebas unitarias para el componente `Select` que garantiza la persistencia de las clases de scroll y límites de altura.

## [1.3.1] - 2026-05-07

### Mejorado

- **Configuración de Productos – Estabilidad:** Los códigos de configuración de productos ahora se generan utilizando el `code` interno de las categorías en lugar de su nombre visual. Esto garantiza que los identificadores de negocio permanezcan estables aunque se renombren las categorías en la interfaz administrativa.
- **API – Integridad de Datos:** Refactorización del proceso de creación de configuraciones para asegurar una generación de códigos consistente y libre de dependencias de visualización.

### Interno

- **Scripts – Corrección de Datos:** Nuevo script de seed `fix-product-config-codes.ts` para normalizar retroactivamente todos los códigos de configuración existentes y eliminar duplicados causados por la remoción del origen.
- **Pruebas – Robustez:** Actualización de la suite de pruebas para validar la nueva lógica de generación de códigos basada en identificadores estables.

## [1.3.0] - 2026-05-07

### Añadido

- **Administración – Asignación Jerárquica:** Nueva interfaz administrativa para asignar Categoría y Líder a los usuarios. El sistema filtra dinámicamente las categorías de tipo `OVERRIDE` y los líderes disponibles basados en el nivel jerárquico superior (`idNextCategory`).
- **Administración – UX Jerárquica:** Etiquetas dinámicas en los selectores que indican el nombre de la categoría superior (ej. "Líder (COACH)") y feedback visual de "Nivel Máximo" cuando no hay niveles superiores configurados.
- **Usuarios – Tabla de Gestión:** Se añadieron columnas de Categoría y Líder a la tabla principal de usuarios para una auditoría visual rápida del árbol jerárquico.

### Mejorado

- **Seguridad – Activación de Usuarios:** El acceso al sistema ahora se rige estrictamente por el estado `active: false`. Los usuarios nuevos creados automáticamente quedan bloqueados y con el rol `AGENTE` por defecto, requiriendo activación manual por un administrador.
- **Notificaciones – Registro de Usuario:** Se centralizó el envío de correos electrónicos a administradores en la capa de creación de usuarios, eliminando notificaciones duplicadas y asegurando una traza de auditoría única.
- **Roles – Simplificación:** Eliminado el rol legacy `DEFAULT`. Todos los nuevos integrantes asumen el rol `AGENTE` desde su primer inicio de sesión, manteniendo la restricción de acceso hasta su aprobación.

### Interno

- **Pruebas – Cobertura de Activación:** Suite de pruebas unitarias actualizada para validar el nuevo flujo de creación con rol `AGENTE` y bloqueo por inactividad.
- **API Admin:** Refactorización del endpoint de usuarios para soportar filtros jerárquicos y relaciones de líder/categoría.

## [1.2.0] - 2026-05-07

### Añadido

- **Negocios – Búsqueda de Agentes:** El campo de búsqueda de agente ahora muestra la categoría del asesor directamente en los resultados del autocompletado, facilitando la identificación.
- **Configuración de Producto – Eliminación Lógica:** La desactivación de configuraciones de producto y reglas de distribución ahora utiliza un borrado lógico (soft delete) para mantener la integridad histórica.
- **Configuración de Producto – Auditoría:** Agregados registros de auditoría obligatorios para la creación, actualización y desactivación de configuraciones de producto y sus reglas de distribución.

### Mejorado

- **Configuración de Producto – Independencia del Origen:** La clave de unicidad y el código generado para la configuración de productos ya no incluyen el segmento de Origen del cliente. La asignación de comisiones ahora se realiza exclusivamente mediante la combinación de Producto y Categoría, simplificando significativamente el modelo de datos.
- **Negocios – Resolución de Comisión:** Al crear un nuevo negocio, el sistema resuelve la comisión aplicable basándose únicamente en el producto y categoría, eliminando la dependencia rígida del origen del cliente.

## [1.1.0] - 2026-05-07

### Añadido

- **Tipos de Categoría – Eliminación Lógica:** Al borrar un tipo de categoría, ahora se preservan sus datos en el sistema marcándolo como inactivo, manteniendo la integridad histórica y previniendo errores de referencias en cascada.
- **Tipos de Categoría – Tabla Genérica:** La vista de administración se ha actualizado para utilizar el componente compartido `DataTable`, ofreciendo sincronización de filtros con la URL, ordenamiento y consistencia visual con el resto de la aplicación.

### Mejorado

- **Formulario de Categorías – Tipos Activos:** Al crear una nueva categoría, el selector de "Tipo de Categoría" ahora muestra exclusivamente los tipos activos.
- **Formulario de Categorías – Edición Segura:** Si se edita una categoría antigua cuyo tipo asignado fue marcado como inactivo, este se mantendrá visible como opción de respaldo en el formulario, previniendo alteraciones involuntarias.
- **Rendimiento:** Se creó un endpoint interno optimizado (`/active`) que elimina el procesamiento de paginación para agilizar la carga del selector de tipos de categoría en los formularios.

## [1.0.2] - 2026-05-07

### Añadido

- **Categorías – Color identificador:** Cada categoría ahora tiene un color asignado (`#RRGGBB`) visible como chip circular en la tabla. El formulario de creación y edición incluye un selector de color nativo con paleta HTML completa.
- **Categorías – Secuencia jerárquica:** Se puede configurar cuál es la siguiente categoría en la jerarquía de la empresa (MS JUNIOR → MS SENIOR → TEAM LEADER → PERFORMANCE LEADER → BUSINESS LEADER → PARTNER → MIA). La tabla muestra la siguiente categoría en una columna dedicada.
- **Categorías – Audit log:** Toda operación de creación, edición o desactivación de categorías queda registrada en el log de auditoría del sistema.

### Mejorado

- **Categorías – Modo beneficiario:** Los valores internos del modo de beneficiario se renombraron a `OVERRIDE` y `BENEFICIARIO_GENERAL` para mayor claridad semántica. El formulario muestra el selector de usuario beneficiario solo cuando el modo es `BENEFICIARIO_GENERAL`.
- **Categorías – Filtro de tipo dinámico:** El filtro de tipo de categoría en la tabla admin ahora carga los tipos directamente desde la base de datos en lugar de ser una lista fija.
- **Categorías – Eliminación segura:** La desactivación de categorías ahora es lógica (cambia el estado a inactivo) en lugar de borrar el registro, preservando la trazabilidad histórica.
- **Administración – ERD actualizado:** El diagrama entidad-relación (`prisma/ERD.md`) se mantiene sincronizado con el esquema de base de datos y se estableció como regla obligatoria actualizarlo ante cualquier cambio de schema.

### Interno

- Migración manual de enum PostgreSQL: `UPLINE_CHAIN → OVERRIDE`, `FIXED_BENEFICIARY → BENEFICIARIO_GENERAL`.
- Seed de categorías reescrito con estrategia 3-pass para manejar la FK auto-referencial de secuencia.
- Nuevas acciones de auditoría: `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DEACTIVATED`.

---

## [1.0.1] - 2026-05-05

### Infraestructura

- **Docker:** Se sincronizaron los nombres de las variables de entorno de producción (`SENDGRID_*_PROD`) y se habilitó la inyección de `SUPER_ADMIN_PASSWORD` en la configuración de producción para asegurar la correcta activación de la cuenta administrativa y el envío de correos.

## [1.0.0] - 2026-05-01

### Añadido

- **Negocios – Aportes y fondeos periódicos:** El sistema ahora calcula y persiste el **número de aportes** (`numAportes`) de cada negocio en el momento de su creación, considerando la periodicidad y las excepciones por compañía/producto (SKANDIA+MFUND → sin aportes; Pago Único / Aportes Ocasionales → 1 aporte). Los aportes se visualizan en el detalle del negocio indicando cuántos han sido fondeados.
- **Negocios – Fechas esperadas de fondeo:** Al fondear un negocio por primera vez (transición EMITIDO → FONDEADO), el sistema genera automáticamente una **fecha esperada** para cada aporte usando `date-fns/addMonths`, creando así un calendario de fondeos proyectados.
- **Negocios – Modal de fondeo multi-aporte:** Nuevo `FundingModal` que permite seleccionar individualmente qué aportes fondear, mostrando su estado (pendiente/fondeado) y fecha anclada cuando corresponde.
- **Compañías – Configuración de moneda:** Las compañías ahora tienen una **moneda asociada** configurable desde el panel de administración. El formulario de compañías incluye un selector de moneda y el campo se persiste en base de datos.

### Mejorado

- **Negocios – Permisos de fondeo por rol:** Los roles `ADMIN` y `ASISTENTE_GERENCIA_OPERATIVA` pueden fondear negocios. El rol `AGENTE` (coach) tiene acceso de **solo lectura** al estado de fondeo — el botón muestra "Ver Fondeo" cuando el negocio tiene aportes registrados, y está oculto si no los tiene.
- **Negocios – Plataforma renombrada a Money Strategist:** La interfaz refleja el nombre comercial actualizado del producto.
- **Administración – Gestión de monedas:** Los formularios de creación y edición de compañías permiten asignar la moneda de operación de cada compañía.
- **Permisos – Funciones de rol centralizadas:** Se reemplazaron las verificaciones de rol inline por funciones reutilizables `canFundPayments()` y `canViewPayments()` en la capa de autorización.

### Interno

- Modelo Prisma `AnnualPayment` renombrado a `Payment` (`@@map("payments")`) para generalizar el concepto más allá de la periodicidad anual. Todas las rutas, servicios, mappers y tests actualizados.
- Acción de auditoría renombrada a `BUSINESS_PAYMENT_FUNDED`.
- Cobertura de tests ampliada: ruta `/fondear-aportes` (5 tests) y `AnnualFundingModal` (4 tests).

## [1.0.0-beta.18] - 2026-04-29

### Añadido

- **Negocios – Contratos alfanuméricos:** El campo de contrato en el formulario ahora acepta letras, números y guiones (ej. `CONT-123`), alineando la validación del frontend con la capacidad de la base de datos. Se incluyeron pruebas unitarias para garantizar la validez de este formato.

### Mejorado

- **Negocios – Legibilidad del encabezado:** Se ajustó el color del texto en el banner principal a `primary-foreground` para asegurar un contraste óptimo en modo claro sobre el fondo verde oscuro. Se simplificó el texto del banner para una interfaz más limpia.

## [1.0.0-beta.17] - 2026-04-26

### Añadido

- **Coach – KPIs en Mis negocios:** Tarjetas compactas con indicadores clave para el perfil coach, coherentes con los filtros por **fecha de creación** del negocio cuando defines un rango de fechas.

### Mejorado

- **Negocios – Exportación Excel operativa:** El archivo descargado respeta el **orden y los nombres de columnas** definidos con operación (por ejemplo **Número de Cédula**, **Correo electrónico**, **Teléfono**, **Periodicidad del pago**, bloque **Creación → Emisión → Fondeo**, líderes adicionales después de **Fecha de Fondeo** y cabeceras **Fecha Fondeo Anualidad** por cuota cuando aplica). La columna **Valor de Negocio** sigue exportándose con **formato moneda** en Excel.
- **Coach – Listado y rutas:** Para coach, el listado puede filtrarse por **fecha de creación** en línea con las estadísticas; las exportaciones usan rangos **inclusivos en calendario Bogotá** donde corresponde. La entrada **/dashboard/agente** redirige al listado de negocios y se eliminó la duplicidad en el menú lateral.

### Corregido

- **Negocios:** Eliminado un import no utilizado en la página del listado que podía generar advertencias en el análisis estático.

### Documentación / Interno

- **OpenSpec:** El spec maestro `negocios` incorpora el requerimiento actualizado de exportación Excel operacional; archivado el cambio SDD `excel-negocios-export-columnas` (`openspec/changes/archive/2026-04-26-excel-negocios-export-columnas/`).

## [1.0.0-beta.16] - 2026-04-25

### Añadido

- **Negocios – Exportación a Excel dinámica:** La exportación ahora incluye el campo **Celular** e inserta dinámicamente columnas de **Fecha inicial/final fondeo** al principio del documento si el reporte se generó usando un filtro de rango de fechas, agilizando las revisiones operativas.

### Mejorado

- **Negocios – UI del formulario simplificada:** La interfaz de creación y edición de negocios consolidó el antiguo bloque de "Información de producto" directamente dentro de la sección de negocio, agrupando armónicamente contrato, producto, compañía, plazo y periodicidad.
- **Negocios – Exportación Excel optimizada:** Se eliminaron las columnas "Mes", "Año" y "Es anualidad", limpiando el reporte de datos redundantes. Se implementó parsing robusto de fechas hidratadas para prevenir cierres inesperados en la exportación por inconsistencia de tipos.
- **Negocios – Coherencia de fondeo de anualidades:** Al fondear anualidades, el sistema actualiza incondicionalmente el campo de anclaje (`dateAnchored`) del negocio padre para garantizar que la transición al estado FONDEADO mantenga una traza temporal inmutable a nivel de dominio.

### Documentación / Interno

- **Pruebas y SDD:** La suite de pruebas fue completamente adaptada (169 tests pasando), cubriendo inserción dinámica de columnas, transacciones directas a nivel de Prisma en el proceso de fondeo y validaciones unitarias en la exportación. Delta specs sincronizados y archivada la propuesta SDD `2026-04-25-ajustes-negocio-excel-fondeo`.

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
