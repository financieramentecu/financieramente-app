-- CreateEnum
CREATE TYPE "BeneficiaryMode" AS ENUM ('UPLINE_CHAIN', 'FIXED_BENEFICIARY');

-- AlterTable
ALTER TABLE "category" ADD COLUMN "beneficiary_mode" "BeneficiaryMode" NOT NULL DEFAULT 'UPLINE_CHAIN',
ADD COLUMN "id_fixed_beneficiary_user" INTEGER;

-- AlterTable
ALTER TABLE "category" ADD CONSTRAINT "category_id_fixed_beneficiary_user_fkey" FOREIGN KEY ("id_fixed_beneficiary_user") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
CREATE INDEX "category_id_fixed_beneficiary_user_idx" ON "category"("id_fixed_beneficiary_user");

-- AlterTable
ALTER TABLE "comission_distribution" ADD COLUMN "id_beneficiary_user" INTEGER;

-- Backfill beneficiary from settlement -> business -> agent user
UPDATE "comission_distribution" AS cd
SET "id_beneficiary_user" = b."id_user"
FROM "settlement_commission" AS sc
INNER JOIN "business" AS b ON b."id_business" = sc."id_business"
WHERE cd."id_settlement_comission" = sc."idSettlementCommission"
  AND sc."id_business" IS NOT NULL;

-- Rows without business: assign minimum id_user if any exist (legacy orphan rows)
UPDATE "comission_distribution" AS cd
SET "id_beneficiary_user" = (SELECT u."id_user" FROM "user" AS u ORDER BY u."id_user" ASC LIMIT 1)
WHERE cd."id_beneficiary_user" IS NULL
  AND EXISTS (SELECT 1 FROM "user" LIMIT 1);

-- Fail if still null
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "comission_distribution" WHERE "id_beneficiary_user" IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: comission_distribution.id_beneficiary_user could not be backfilled for all rows';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "comission_distribution" ALTER COLUMN "id_beneficiary_user" SET NOT NULL;

-- AlterTable
ALTER TABLE "comission_distribution" ADD CONSTRAINT "comission_distribution_id_beneficiary_user_fkey" FOREIGN KEY ("id_beneficiary_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "comission_distribution_id_beneficiary_user_idx" ON "comission_distribution"("id_beneficiary_user");

-- Optional: FIXED_BENEFICIARY must reference a user
ALTER TABLE "category" ADD CONSTRAINT "category_fixed_beneficiary_check" CHECK (
  ("beneficiary_mode" <> 'FIXED_BENEFICIARY'::"BeneficiaryMode")
  OR ("id_fixed_beneficiary_user" IS NOT NULL)
);
