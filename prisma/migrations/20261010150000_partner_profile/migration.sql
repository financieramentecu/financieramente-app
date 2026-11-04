-- CreateEnum
CREATE TYPE "AccountTokenType" AS ENUM ('ACTIVATION', 'RESET');

-- AlterTable
ALTER TABLE "user" ADD COLUMN "activated_at" TIMESTAMP(3);

-- Backfill: every pre-existing user keeps being able to log in (AA-01 / D9).
UPDATE "user" SET "activated_at" = "created_at" WHERE "activated_at" IS NULL;

-- CreateTable
CREATE TABLE "account_token" (
    "id" SERIAL NOT NULL,
    "id_user" INTEGER NOT NULL,
    "type" "AccountTokenType" NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_token_token_hash_key" ON "account_token"("token_hash");

-- CreateIndex
CREATE INDEX "account_token_id_user_type_idx" ON "account_token"("id_user", "type");

-- AddForeignKey
ALTER TABLE "account_token" ADD CONSTRAINT "account_token_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
