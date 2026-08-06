-- CreateTable
CREATE TABLE "report_definition" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "route_path" VARCHAR(200) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_report_permission" (
    "id" SERIAL NOT NULL,
    "id_report" INTEGER NOT NULL,
    "id_category" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_report_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_definition_code_key" ON "report_definition"("code");

-- CreateIndex
CREATE INDEX "category_report_permission_id_category_idx" ON "category_report_permission"("id_category");

-- CreateIndex
CREATE INDEX "category_report_permission_id_report_idx" ON "category_report_permission"("id_report");

-- CreateIndex
CREATE UNIQUE INDEX "category_report_permission_id_report_id_category_key" ON "category_report_permission"("id_report", "id_category");

-- AddForeignKey
ALTER TABLE "category_report_permission" ADD CONSTRAINT "category_report_permission_id_report_fkey" FOREIGN KEY ("id_report") REFERENCES "report_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_report_permission" ADD CONSTRAINT "category_report_permission_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "category"("id_category") ON DELETE RESTRICT ON UPDATE CASCADE;
