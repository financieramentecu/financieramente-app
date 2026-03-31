# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.0.0-beta.0] - 2026-03-30

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
