-- CreateTable distribution_approval: stores coach/leader approvals
-- "Estoy de acuerdo" per file import.
CREATE TABLE "public"."distribution_approval" (
    "id_distribution_approval" SERIAL NOT NULL,
    "id_file_import" INTEGER NOT NULL,
    "id_user" INTEGER NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_approval_pkey" PRIMARY KEY ("id_distribution_approval")
);

-- CreateIndex
CREATE UNIQUE INDEX "distribution_approval_file_user_key" ON "public"."distribution_approval"("id_file_import", "id_user");

-- CreateIndex
CREATE INDEX "distribution_approval_id_file_import_idx" ON "public"."distribution_approval"("id_file_import");

-- CreateIndex
CREATE INDEX "distribution_approval_id_user_idx" ON "public"."distribution_approval"("id_user");

-- AddForeignKey
ALTER TABLE "public"."distribution_approval"
    ADD CONSTRAINT "distribution_approval_id_file_import_fkey"
    FOREIGN KEY ("id_file_import") REFERENCES "public"."file_import"("id_file_import")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."distribution_approval"
    ADD CONSTRAINT "distribution_approval_id_user_fkey"
    FOREIGN KEY ("id_user") REFERENCES "public"."user"("id_user")
    ON DELETE CASCADE ON UPDATE CASCADE;
