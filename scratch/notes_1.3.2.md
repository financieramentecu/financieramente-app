### Corregido

- **Interfaz – Selectores con scroll:** Se resolvió un problema de usabilidad en el componente `Select` donde las listas largas de opciones (ej. > 10 ítems) quedaban recortadas y no permitían el desplazamiento. Ahora el componente implementa un scroll nativo con una altura máxima de 320px (`max-h-80`), asegurando que todos los elementos sean accesibles en cualquier resolución.

### Interno

- **Componentes – Refactor de Altura:** Eliminación de restricciones de altura vinculadas dinámicamente al disparador (`trigger-height`) en el `Viewport` de Radix UI para permitir el crecimiento natural del contenido hasta el límite máximo.
- **Pruebas – Validación de UI:** Implementación de suite de pruebas unitarias para el componente `Select` que garantiza la persistencia de las clases de scroll y límites de altura.
