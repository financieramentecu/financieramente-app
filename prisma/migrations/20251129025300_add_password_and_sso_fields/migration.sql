-- AlterTable
ALTER TABLE "user" ADD COLUMN     "password" VARCHAR(255),
ADD COLUMN     "sso_only" BOOLEAN NOT NULL DEFAULT true;
