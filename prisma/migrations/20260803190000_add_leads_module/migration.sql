-- CreateTable
CREATE TABLE "lead_funnel_column" (
    "id_lead_funnel_column" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "external_status_key" VARCHAR(150) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_fallback" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_funnel_column_pkey" PRIMARY KEY ("id_lead_funnel_column")
);

-- CreateTable
CREATE TABLE "lead" (
    "id_lead" SERIAL NOT NULL,
    "external_crm_id" VARCHAR(150),
    "name" VARCHAR(200),
    "last_name" VARCHAR(200),
    "email" VARCHAR(150),
    "phone" VARCHAR(30),
    "identity_number" VARCHAR(20),
    "origin_tag" VARCHAR(120),
    "external_url" TEXT,
    "id_user" INTEGER,
    "id_lead_funnel_column" INTEGER NOT NULL,
    "id_business" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id_lead")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_funnel_column_external_status_key_key" ON "lead_funnel_column"("external_status_key");

-- CreateIndex
CREATE INDEX "lead_funnel_column_position_idx" ON "lead_funnel_column"("position");

-- CreateIndex
CREATE UNIQUE INDEX "lead_external_crm_id_key" ON "lead"("external_crm_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_id_business_key" ON "lead"("id_business");

-- CreateIndex
CREATE INDEX "lead_id_user_idx" ON "lead"("id_user");

-- CreateIndex
CREATE INDEX "lead_id_lead_funnel_column_idx" ON "lead"("id_lead_funnel_column");

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_id_lead_funnel_column_fkey" FOREIGN KEY ("id_lead_funnel_column") REFERENCES "lead_funnel_column"("id_lead_funnel_column") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_id_business_fkey" FOREIGN KEY ("id_business") REFERENCES "business"("id_business") ON DELETE SET NULL ON UPDATE CASCADE;
