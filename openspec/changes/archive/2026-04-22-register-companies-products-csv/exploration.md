## Exploration: Actualizar seed con CSV

### Current State
Actualmente, los archivos `prisma/seeds/company.ts` y `prisma/seeds/product.ts` tienen arreglos "quemados" (hardcoded). Por ejemplo, `company.ts` solo registra `SKANDIA` (del tipo 'NACIONAL') y `product.ts` solo registra un pequeño grupo de productos locales predeterminados, todos asumidos para `SKANDIA` y con el tipo de producto por defecto fijado a 'POLIZA DE VIDA'.

### Affected Areas
- `prisma/seed.ts` — Puede centralizar la apertura y parseo del archivo para no multiplicarla.
- `prisma/seeds/company.ts` — Pasará de leer una constante Array a recibir datos dinámicos, procesando las entidades únicas de la columna de Compañías.
- `prisma/seeds/product.ts` — Recibirá la data cruda, asociará cada producto (nombre de producto) a su respectiva compañía en la base de datos (resolviendo el `idCompany`) evitando colisiones de UNIQUE.

### Approaches
1. **Lectura dinámica del CSV crudo en Runtime (`fs.readFileSync`)**
   - Pros: Solución nativa; la fuente de la verdad se mantiene en un archivo plano fácil de actualizar.
   - Cons: Hay que escribir el manejador de CSV manualmente para comillas, saltos de línea y celdas vacías (`/` o `,,`).
   - Effort: Low

2. **Conversión de CSV a Typescript estático previamente**
   - Pros: Menos errores en producción referidos a archivos perdidos. Tipado fuerte.
   - Cons: Agrega un paso intermedio en la generación.
   - Effort: Low

3. **Orquestación en `seed.ts` y parseo con la librería instalada `xlsx`**
   - Pros: Lectura impecable sin importar comillas o nulos irregulares; solo un flujo principal; máxima flexibilidad para cruce.
   - Cons: Requiere un leve refactor a las funciones asíncronas para inyectar este prop en las llamadas actuales.
   - Effort: Medium

### Recommendation
**Approach 3 (Orquestación en `seed.ts` y parseo con `xlsx`)**. 
Centralizar la lectura del archivo en memoria previene lecturas redundantes en el disco, permite que toda la información errática se formatee correctamente antes de llamar la inserción con Prisma.

### Risks
- **Valores Faltantes y Constraints**: El excel contiene nulos y ("/") en términos.
- **Relaciones requeridas invisibles**: No precisa TypeCompany (Internacional/Nacional) por lo que debe ser inferido por nombre en un hardcode fallback mapping.
- **Unique Constraint [idCompany, name]**: Hay productos en el excel que pertenecen a la misma compañía pero distinto término con el mismo pattern de nombre ("ACS***"). Evitar duplicados pre-purgando set.

### Ready for Proposal
Yes
