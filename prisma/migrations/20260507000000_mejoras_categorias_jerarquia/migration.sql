-- Rename BeneficiaryMode enum values
ALTER TYPE "BeneficiaryMode" RENAME VALUE 'UPLINE_CHAIN' TO 'OVERRIDE';
ALTER TYPE "BeneficiaryMode" RENAME VALUE 'FIXED_BENEFICIARY' TO 'BENEFICIARIO_GENERAL';

-- Add color column (with default for existing rows)
ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "color" VARCHAR(7) NOT NULL DEFAULT '#cccccc';

-- Add id_next_category column (self-referential FK)
ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "id_next_category" INTEGER;

-- Add foreign key constraint
ALTER TABLE "category" ADD CONSTRAINT "category_id_next_category_fkey"
  FOREIGN KEY ("id_next_category")
  REFERENCES "category"("id_category")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Add index on id_next_category
CREATE INDEX IF NOT EXISTS "category_id_next_category_idx" ON "category"("id_next_category");
