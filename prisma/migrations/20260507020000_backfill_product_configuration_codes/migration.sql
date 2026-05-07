-- Backfill codes para ProductConfiguration al nuevo formato sin origen: COMPANY-PRODUCT-CATEGORY
-- Usa ROW_NUMBER para detectar y resolver colisiones de código entre distintos (idProduct, idCategory).
-- UPPER() se aplica antes de los REGEXP_REPLACE para preservar todas las letras del nombre.

-- Step 1: Resetear todos los códigos a valores temporales únicos
UPDATE product_configuration SET code = 'TEMP-' || id_product_configuration::text;

-- Step 2: Asignar código con sufijo a filas INACTIVAS (garantiza unicidad global)
-- Nota: en PostgreSQL UPDATE...FROM, los JOINs del FROM no pueden referenciar la tabla target.
-- Se usan condiciones implícitas en WHERE en su lugar.
UPDATE product_configuration pc
SET code = REGEXP_REPLACE(
  REGEXP_REPLACE(
    UPPER(c.name || '-' || p.name || '-' || cat.name),
    '\s+', '_', 'g'
  ),
  '[^A-Z0-9_\-]', '', 'g'
) || '-' || pc.id_product_configuration::text
FROM product p, company c, category cat
WHERE pc.id_product = p.id_product
  AND p.id_company = c.id_company
  AND pc.id_category = cat.id_category
  AND pc.active = false;

-- Step 3: Asignar código limpio a filas ACTIVAS
-- Si dos configuraciones activas distintas generan el mismo código base,
-- la primera (id menor) recibe el código limpio y las siguientes reciben sufijo -id.
WITH base_codes AS (
  SELECT
    pc.id_product_configuration,
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        UPPER(c.name || '-' || p.name || '-' || cat.name),
        '\s+', '_', 'g'
      ),
      '[^A-Z0-9_\-]', '', 'g'
    ) AS base_code,
    ROW_NUMBER() OVER (
      PARTITION BY REGEXP_REPLACE(
        REGEXP_REPLACE(
          UPPER(c.name || '-' || p.name || '-' || cat.name),
          '\s+', '_', 'g'
        ),
        '[^A-Z0-9_\-]', '', 'g'
      )
      ORDER BY pc.id_product_configuration ASC
    ) AS code_rn
  FROM product_configuration pc
  JOIN product p ON p.id_product = pc.id_product
  JOIN company c ON c.id_company = p.id_company
  JOIN category cat ON cat.id_category = pc.id_category
  WHERE pc.active = true
)
UPDATE product_configuration pc
SET code = CASE
  WHEN b.code_rn = 1 THEN b.base_code
  ELSE b.base_code || '-' || pc.id_product_configuration::text
END
FROM base_codes b
WHERE pc.id_product_configuration = b.id_product_configuration;
