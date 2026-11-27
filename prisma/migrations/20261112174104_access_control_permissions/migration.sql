-- CreateEnum
CREATE TYPE "DataScope" AS ENUM ('OWN', 'TEAM', 'COMPANY');

-- AlterTable
ALTER TABLE "role" ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "permission" (
    "id_permission" SERIAL NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "module" VARCHAR(60) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "supports_scope" BOOLEAN NOT NULL DEFAULT false,
    "supports_min_level" BOOLEAN NOT NULL DEFAULT false,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id_permission")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id_role_permission" SERIAL NOT NULL,
    "id_role" INTEGER NOT NULL,
    "id_permission" INTEGER NOT NULL,
    "scope" "DataScope",
    "id_min_level" INTEGER,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id_role_permission")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "permission_module_idx" ON "permission"("module");

-- CreateIndex
CREATE INDEX "role_permission_id_permission_idx" ON "role_permission"("id_permission");

-- CreateIndex
CREATE INDEX "role_permission_id_min_level_idx" ON "role_permission"("id_min_level");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_id_role_id_permission_key" ON "role_permission"("id_role", "id_permission");

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_id_role_fkey" FOREIGN KEY ("id_role") REFERENCES "role"("id_role") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_id_permission_fkey" FOREIGN KEY ("id_permission") REFERENCES "permission"("id_permission") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_id_min_level_fkey" FOREIGN KEY ("id_min_level") REFERENCES "level"("id_level") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename the DEFAULT role to SIN_ROL (users keep the link through id_role).
UPDATE "role"
SET "code" = 'SIN_ROL',
    "name" = 'Sin rol asignado',
    "description" = 'Usuarios nuevos pendientes de activación. No tiene permisos.'
WHERE "code" = 'DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM "role" WHERE "code" = 'SIN_ROL');

-- System roles cannot be deleted or have their code changed.
UPDATE "role" SET "is_system" = true WHERE "code" IN ('ADMIN', 'PARTNER', 'SIN_ROL');
