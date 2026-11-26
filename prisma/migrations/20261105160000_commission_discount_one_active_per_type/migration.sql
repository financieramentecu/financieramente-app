-- COM-65: only one ACTIVE commission discount per type.
--
-- Prisma cannot declare partial unique indexes in schema.prisma, so this is
-- raw SQL (same approach as "discount_one_active_idx").
--
-- Safety check: fail with a readable message instead of silently choosing a
-- discount when duplicated ACTIVE rows already exist. Resolve them manually
-- (inactivate the extra rows) and re-run the migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "commission_discount"
    WHERE "status" = 'ACTIVE'
    GROUP BY "type"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'commission_discount has more than one ACTIVE row for the same type. Inactivate the duplicates before applying this migration.';
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "commission_discount_one_active_per_type_idx"
  ON "commission_discount"("type")
  WHERE "status" = 'ACTIVE';
