# Proposal: Register Companies and Products via CSV (Hardcoded Data)

## Intent

Actualmente, las compañías y productos financieros iniciales están quemados (hardcoded) en los scripts de seed (solo se contempla SKANDIA y un puñado de productos). Este cambio actualizará los arreglos estáticos basándose enteramente en la información de `CALCULADORA MIA - Productos.csv`. Sin embargo, en vez de leer el CSV en runtime, pasaremos la información del CSV a formato código estático Typescript en los respectivos módulos y vincularemos su relación de ID dinámicamente consultando la Base de Datos al ejecutarse.

## Scope

### In Scope

- Extracción manual o semi-automatizada del archivo `CALCULADORA MIA - Productos.csv` convirtiéndola a Arrays nativos de TypeScript.
- Modificación de `prisma/seeds/company.ts` agregando la lista de todas las empresas listadas en el CSV.
- Modificación de `prisma/seeds/product.ts` agregando un arreglo estático de objetos (`[{ company: 'NOMBRE', name: 'PRODUCTO' }]`).
- Modificación funcional en `seedProducts(prisma)` para que consulte en BBDD el `idCompany` de antemano basado en el string estático guardado.

### Out of Scope

- Lectura en memoria del archivo `.csv` original en el script de seed mediante librerías como `xlsx` o `fs`.
- Cambio en el esquema original de Prisma (`schema.prisma`).

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `seed-pipeline`: La lista de poblado estático se expande para abarcar todo el portafolio real validado actualmente.

## Approach

**Static Data approach con Lookup Dinámico**: Extrapolaremos la visualización del archivo que enviamos en la Exploración para generar dos Listas estáticas (Constantes): `companies` y `products`. 
`company.ts` operará de modo natural.
`product.ts` iterará sobre su lista estática y, dado que no poseemos el `idCompany` explícito (foreign key), realizará una búsqueda (`findFirst` usando el `name` de la empresa contenido en el objeto iterado). Una vez encontrado el registro en DB, inyectará ese ID para realizar el `upsert` o `create` del Producto respectivo, manteniendo la integridad relacional de Prisma intacta.

## Affected Areas

| Area                      | Impact   | Description                                                                                       |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `prisma/seeds/company.ts` | Modified | Ampliación de arreglo quemado (hardcoded).                                    |
| `prisma/seeds/product.ts` | Modified | Reemplazo de array numérico/plano por array de objetos. Lookup asíncrono a la tabla `company` antes de crear el `product`. |

## Risks

| Risk                                               | Likelihood | Mitigation                                                                                                                                                       |
| -------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desajuste ortográfico de Empresa | Medium     | Si el string en el producto no coincide *exactamente* con el string de compañía insertado antes, la query `findFirst` regresará `null` rompiendo la seed. Mitigado usando constante de Strings unificados. |

## Rollback Plan

Restaurar los scripts originales `company.ts` y `product.ts` (SKANDIA puro) desde el control de versiones previo.

## Dependencies

- Ninguna dependencia adicional.

## Success Criteria

- [ ] `npx tsx prisma/seed.ts` completa la ejecución sin excepciones.
- [ ] La tabla `Company` tiene el set completo del Excel.
- [ ] La tabla `Product` consolida correctamente un registro de producto asociando su foreign key con el id local de la empresa a la que pertenece.
