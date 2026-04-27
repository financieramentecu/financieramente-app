# Tasks: Register Companies and Products via CSV

## Phase 1: Data Setup (Constants)

- [x] 1.1 Modificar `prisma/seeds/company.ts` reemplazando la constante quemada por un arreglo tipado `Array<{ name: string, type: string }>` con las 8 compañías de la calculadora (SKANDIA, MEJORCDT, ITA, TRINITY, MANHATTAN, AFIBL, DOMINION, STONEX).
- [x] 1.2 Extraer manualmente los productos únicos mapeados a su compañía madre y transcribirlos en `prisma/seeds/product.ts` como un arreglo `products: Array<{ companyName: string, name: string }>`.

## Phase 2: Core Implementation (Refactoring seed loops)

- [x] 2.1 Refactorizar `seedCompanies()` en `prisma/seeds/company.ts` garantizando que use las nuevas propiedades tipadas (`company.type`) en vez del anterior hardcode.
- [x] 2.2 Refactorizar `seedProducts()` en `prisma/seeds/product.ts` iterando sobre el nuevo arreglo `products`. Eliminar la constante dura a nombre de SKANDIA de la cabecera.
- [x] 2.3 Añadir la consulta de Foreign Key al inicio del bucle: `const comp = await prisma.company.findFirst({ where: { name: p.companyName } })`.
- [x] 2.4 Controlar nulos: Si `!comp`, lanzar advertencia por consola con el nombre faltante y hacer `continue` para no bloquear el script.
- [x] 2.5 Reemplazar el inyector `idCompany: skandia.idCompany` por `comp.idCompany` en las instrucciones `findFirst`, `update` y `create` de Prisma.

## Phase 3: Testing / Verification

- [x] 3.1 Probar ejecución global de seed: `npx tsx prisma/seed.ts`.
- [x] 3.2 Validar desde BD la inserción asíncrona garantizando que no se crearon combinaciones huerfanas ni falló el unique constraint.
