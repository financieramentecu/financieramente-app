-- AlterTable
ALTER TABLE "user" ALTER COLUMN "identity_number" DROP NOT NULL;

-- RenameIndex
ALTER INDEX "user_type_identity_identity_number_key" RENAME TO "user_typeIdentity_identityNumber_key";
