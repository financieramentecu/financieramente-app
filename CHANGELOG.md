# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

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
