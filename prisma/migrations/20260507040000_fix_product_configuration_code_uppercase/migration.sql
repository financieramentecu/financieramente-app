-- Fix: el backfill anterior aplicaba UPPER() después del regex [^A-Z0-9_\-],
-- eliminando letras minúsculas antes de convertirlas. Ej: "MS Junior" → "MS_J" en vez de "MS_JUNIOR".
-- Corrección: UPPER() se aplica primero, luego los REGEXP_REPLACE.

-- Step 1: Resetear todos los códigos a valores temporales únicos
UPDATE product_configuration SET code = 'TEMP-' || id_product_configuration::text;

-- Step 2: Asignar código con sufijo a filas INACTIVAS
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

-- Step 3: Asignar código limpio a filas ACTIVAS con manejo de colisiones
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
