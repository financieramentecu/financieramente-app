### Corregido

- **Compañías – Validación de Moneda:** Se flexibilizó la validación del campo `idCurrency` para permitir tanto números como cadenas de texto. Esto resuelve el error "Invalid input" que ocurría al guardar cambios en empresas desde el panel administrativo.
- **Compañías – Feedback de Eliminación:** Se corrigió un error de estado reactivo que impedía que el diálogo de confirmación se cerrara y mostrara el mensaje de éxito tras eliminar una empresa. Ahora la interfaz responde instantáneamente a la acción.

### Añadido

- **Compañías – Edición de Nombre:** Se habilitó la posibilidad de modificar el nombre de la empresa directamente desde el formulario de edición, manteniendo la validación de unicidad en el sistema.

### Interno

- **Pruebas – Cobertura de Validación:** Actualización de la suite de pruebas unitarias para cubrir casos de tipos de moneda mixtos (string/number) y asegurar la estabilidad de los esquemas de Zod.
- **SDD – Documentación de Cambio:** Generación de especificaciones, diseño y reporte de verificación para el ciclo de vida del cambio `fix-company-validation-delete`.
