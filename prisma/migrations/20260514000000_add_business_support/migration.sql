-- CreateTable
CREATE TABLE "business_support" (
    "id" TEXT NOT NULL,
    "business_id" INTEGER NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_support_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_support_object_key_key" ON "business_support"("object_key");

-- CreateIndex
CREATE INDEX "business_support_business_id_status_idx" ON "business_support"("business_id", "status");

-- CreateIndex
CREATE INDEX "business_support_uploaded_by_idx" ON "business_support"("uploaded_by");

-- AddForeignKey
ALTER TABLE "business_support" ADD CONSTRAINT "business_support_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id_business") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_support" ADD CONSTRAINT "business_support_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
