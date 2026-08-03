-- AlterTable
ALTER TABLE "business" ADD COLUMN     "novedad_marked_at" TIMESTAMP(3),
ADD COLUMN     "novedad_resolved_at" TIMESTAMP(3),
ADD COLUMN     "novedad_status" VARCHAR(20);
