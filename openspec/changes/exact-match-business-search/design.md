## Contexto

Actualmente, el listado de negocios permite una búsqueda global que utiliza el operador `contains` de Prisma en múltiples campos (`contract`, `client.name`, `client.email`, etc.). Esto dificulta la localización de registros específicos cuando existen múltiples coincidencias parciales con identificadores similares.

## Objetivos / No-Objetivos

**Objetivos:**
- Implementar un parámetro opcional `exactMatch` en la API de listado de negocios.
- Modificar la lógica del backend para alternar entre `contains` e `equals` basado en dicho parámetro.
- Añadir un control visual (checkbox) en la barra de herramientas de la tabla de negocios.

**No-Objetivos:**
- Modificar el esquema de la base de datos.
- Cambiar el comportamiento de búsqueda en otros módulos (ej: agentes o clientes) fuera del contexto de negocios.
- Implementar búsqueda fonética o difusa avanzada.

## Decisiones

- **Parámetro de API**: Se utilizará un query param `exactMatch=true/false`.
- **Lógica de Prisma**: 
    - Si `exactMatch` es `true`, los campos `contract` e `identityNumber` usarán el operador `equals`.
    - Los campos de texto libre como nombres seguirán usando `contains` para evitar fallos por espacios o tildes, a menos que el usuario sea muy específico.
- **UI**: Se integrará un `Checkbox` de Shadcn/UI en el `DataTableToolbar` de negocios mediante la prop `renderAdditionalFilters`.

## Riesgos / Trade-offs

- **Experiencia de Usuario**: Existe el riesgo de que el usuario deje activado el modo "Exacto" y piense que el sistema no funciona al no encontrar resultados para términos parciales. Se mitigará mediante una etiqueta clara y posiblemente reseteando el check al limpiar la búsqueda.
- **Rendimiento**: No se esperan impactos significativos en el rendimiento ya que `equals` suele ser más rápido o igual que `contains` con índices adecuados.
