---
name: Move code to ProductConfiguration
overview: Mover el campo `code` de ProductPercentajeCommision a ProductConfiguration, ya que identifica la combinación (producto, origen, categoría) que representa la configuración.
todos: []
isProject: false
---

# Mover `code` a ProductConfiguration

## Contexto

Hoy `code` está en **ProductPercentajeCommision** (ej. `"SKANDIA-PERSONAL-REFERIDO"`). En el seed se construye como `${producto}-${origen}-${categoría}`, que es exactamente la tripleta que representa **ProductConfiguration**. Por tanto, el `code` pertenece a la configuración (combinación), no a cada “versión” PPC.

**Formato del `code**`: `{PRODUCTO}-{ORIGEN}-{CATEGORÍA}` en mayúsculas. Si producto, origen o categoría tienen espacio(s), reemplazar por `_` en los tres. Ejemplo: `**CREA_PATRIMONIO-PROPIO-JUNIOR**`.

## Buenas prácticas aplicadas (software-architecture + typescript-expert)

- **Nombres de dominio**: Función con nombre explícito `buildProductConfigurationCode` (evitar `utils`/`helpers` genéricos).
- **Separación de responsabilidades**: Lógica de construcción del `code` en un módulo dedicado del feature (`lib/product-configuration-code.ts`), reutilizable y testeable; el seed solo orquesta y llama a esa función.
- **Una responsabilidad**: La función solo normaliza y une producto/origen/categoría; no mezcla con Prisma ni UI.
- **TypeScript**: Parámetros tipados (`productName: string`, etc.), tipo de retorno explícito `: string`, sin `any`. Constantes nombradas para separador y regex si se desea documentar la regla.
- **Early return**: En el seed, usar `continue` temprano cuando falten datos en lugar de anidar condicionales.
- **Funciones acotadas**: Mantener la función por debajo de ~15 líneas; archivos del feature por debajo de 200 líneas.

## Cambios

### 1. Schema Prisma

- **[prisma/schema.prisma](prisma/schema.prisma)**  
  - En **ProductConfiguration**: añadir `code String? @db.VarChar(50)` (nullable; se puede rellenar en migración/seed).  
  - En **ProductPercentajeCommision**: quitar el campo `code`.

### 2. Migración SQL

- **Nueva migración** (ej. `add_code_to_product_configuration_drop_from_ppc`):  
  1. Añadir columna `code` a `product_configuration` (VARCHAR(50), nullable).
  2. Opcional: rellenar `product_configuration.code` desde el primer PPC por configuración, p. ej.
    `UPDATE product_configuration pc SET code = (SELECT code FROM product_percentaje_commision ppc WHERE ppc.id_product_configuration = pc.id_product_configuration ORDER BY ppc.id_product_percentaje_commision LIMIT 1)`.
  3. Eliminar columna `code` de `product_percentaje_commision`.

Si la migración `20260202120000_add_product_configuration_and_refactor_ppc` **aún no se ha aplicado** en ningún entorno, se puede incorporar `code` en `product_configuration` y no crear `code` en PPC en esa misma migración, y así evitar una migración extra.

### 3. Lógica de dominio (lib)

- **Nuevo: [src/features/negocios/lib/product-configuration-code.ts**](src/features/negocios/lib/product-configuration-code.ts)  
  - Función pura `buildProductConfigurationCode(productName: string, originName: string, categoryName: string): string`.  
  - Normaliza cada parte: espacios → `_`, mayúsculas; une con `-`. Sin dependencias de Prisma ni UI.  
  - Tipos explícitos y retorno `string`; constantes nombradas para separador/regex si se desea.  
  - **Tests**: Añadir `__tests__/lib/product-configuration-code.test.ts` con casos (espacios, mayúsculas, ejemplo `CREA_PATRIMONIO-PROPIO-JUNIOR`).

### 4. Seed

- **[prisma/seeds/product-percentage.ts](prisma/seeds/product-percentage.ts)**  
  - Importar `buildProductConfigurationCode` desde el feature (path relativo o alias según proyecto).  
  - Al crear **ProductConfiguration**, asignar `code: buildProductConfigurationCode(product.name, config.origin.name, config.category.name)`.  
  - Al crear **ProductPercentajeCommision**, no enviar `code`.  
  - Usar early `continue` cuando falte `config.category` u otros datos.  
  - El `console.log` de “Configuración Maestra creada” debe usar `productConfiguration.code`.

### 5. Tests y mocks

- **[src/features/negocios/tests/fixtures/mock-prisma-business.ts](src/features/negocios/__tests__/fixtures/mock-prisma-business.ts)**  
  - Quitar `code` del objeto `productPercentajeCommision`.  
  - Añadir `code: 'CREA_PATRIMONIO-PROPIO-JUNIOR'` en `productConfiguration`.

### 6. Documentación ERD

- **[prisma/ERD.md](prisma/ERD.md)**  
  - En la entidad **ProductConfiguration**, añadir el atributo `string code`.  
  - En **ProductPercentajeCommision**, quitar `code` del listado de atributos.

## Resumen de responsabilidad


| Antes                                        | Después                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `code` en PPC (por “versión” de porcentajes) | `code` en ProductConfiguration (por combinación producto/origen/categoría) |


No hay usos de `ppc.code` o `productPercentajeCommision.code` en `src/`; solo en seed y en el mock, que quedan alineados con el nuevo modelo.