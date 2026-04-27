# Design: Register Companies and Products via CSV (Hardcoded Data)

## Technical Approach

Adoptar un **Static Data Approach con Lookup Dinámico** para la carga de datos del portafolio. Toda la data originada en el CSV será convertida manualmente en arreglos estáticos de TypeScript en los scripts de utilidad de Prisma, evitando el parsing en runtime (lectura IO / dependencias xlsx en producción). Los productos mantendrán integridad relacional al resolver asíncronamente el ID de la compañía padre previo al `upsert`.

## Architecture Decisions

### Decision: Enfoque de inyección de datos

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Hardcode Constants (Static Arrays)** | Máximo performance y nula dependencia a parseo de librerías/archivos externos al momento de ejecutar los seeds (`prisma db seed`). Require modificar el TS manualmente ante nuevos productos. | **Chosen** |
| Runtime Excel Parser (`xlsx`) | Excelente para no tocar código si llega un Excel nuevo; alto mantenimiento y propensión a fallback nulos por formato débil. | Rejected |
| Conversión intermedia TS pre-seed | Seguro y fuertemente tipado pero requiere orquestar un paquete custom o scripts node ajenos a Prisma. | Rejected |

**Rationale**: Dado que los productos financieros y compañías no varían diariamente y el sistema depende de IDs estables, incrustar un pre-procesamiento estático de la tabla elimina el vector de error por I/O que el orquestador principal experimenta con lecturas locales y librerías de parsing innecesarias.

### Decision: Resolución de Identidad de las Compañías para los Productos

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Prisma Foreign Key asíncrono Lookup (`findFirst`)** | Interroga a la BD en cada ciclo de inserción de un producto. Ligeramente más lento (decenas de queries N+1), pero totalmente seguro para consistencia Foreign Key en Prisma independientemente de si los IDs autoincrementales cambiaran de seed en seed. | **Chosen** |
| Prisma Connect Relation | Se podría hacer usando la sintaxis anidada `connect: { name: compName }` si `name` fuera un `@unique` constraint garantizado. | Rejected (name no es unique solitario o es propenso a cambios parciales sin unificarse del todo en subnodos) |
| InMemory ID Map Cache | Cargar todas las compañías primero con un query global y hacer mapeo cruzado en la memoria JS (hashmap). Rápido para N muy grande, overkill para solo 8 empresas actuales. | Rejected (over-optimization) |

## Data Flow

    [seed.ts] main()
         │
         ├──→ seedCompanies(prisma)
         │       └─ Iterates over static constant `companies` (TRINITY, ITA, etc).
         │       └─ upserts -> Table: Company (Returns generated auto_inc IDs implicit in DB)
         │
         ├──→ seedProducts(prisma)
                 └─ Iterates over static constant `products` [{companyName, name}]
                 └─ For each => prisma.company.findFirst({ where: { name } })
                 │   ├── If NOT FOUND -> Skip / Error log
                 │   └── If FOUND -> Extract `idCompany`
                 └─ upserts -> Table: Product (with idCompany and idTypeProduct resolved)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/seeds/company.ts` | Modify | Expandimos la constante `companies` para incorporar el mapeo de `['SKANDIA', 'MEJORCDT', 'ITA', 'TRINITY', 'MANHATTAN', 'AFIBL', 'DOMINION', 'STONEX']` con sus respectivos tipos (Nacional o Internacional). |
| `prisma/seeds/product.ts` | Modify | Reemplazamos la variable `productNames: string[]` constante por `products: Array<{companyName: string, name: string}>`. Agregamos la lógica `await prisma.company.findFirst(...)` en el bucle subyacente y reemplazamos la variable dura skandia por sub-variables controladas. |

## Interfaces / Contracts

```typescript
// En prisma/seeds/company.ts
export const companies: Array<{ name: string; type: string }> = [
  { name: 'SKANDIA', type: 'NACIONAL' },
  { name: 'MEJORCDT', type: 'NACIONAL' },
  { name: 'TRINITY', type: 'INTERNACIONAL' },
  // ... 
];

// En prisma/seeds/product.ts
export const products: Array<{ companyName: string; name: string }> = [
  { companyName: 'TRINITY', name: 'PROTECTION PLUS' },
  // ... depurados del CSV
];
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | Seed consistency | Correr el seed y validar por Prisma Studio o CLI que no existen productos huérfanos y que el constraint unique compuesto `[idCompany, name]` no falló con duplicados erróneos del CSV. |

## Migration / Rollout

No migration required. La inserción usará la lógica pre-existente `findFirst` para evaluar si necesita `create` o `update`, garantizando retro-compatibilidad.

## Open Questions

- None
