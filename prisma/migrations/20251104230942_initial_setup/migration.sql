-- CreateTable
CREATE TABLE "company" (
    "id_company" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "id_type_company" VARCHAR(20) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id_company")
);

-- CreateTable
CREATE TABLE "product_origin" (
    "id_origin" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_origin_pkey" PRIMARY KEY ("id_origin")
);

-- CreateTable
CREATE TABLE "client_origin" (
    "id_client_origin" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_origin_pkey" PRIMARY KEY ("id_client_origin")
);

-- CreateTable
CREATE TABLE "category" (
    "id_category" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "type_category" VARCHAR(20) NOT NULL,
    "descripcion" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id_category")
);

-- CreateTable
CREATE TABLE "type_user" (
    "id_type_user" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "nivel_jerarquico" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "type_user_pkey" PRIMARY KEY ("id_type_user")
);

-- CreateTable
CREATE TABLE "buy_periodicity" (
    "id_buy_periodicity" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buy_periodicity_pkey" PRIMARY KEY ("id_buy_periodicity")
);

-- CreateTable
CREATE TABLE "currency" (
    "id_currency" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "symbol" VARCHAR(5),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_pkey" PRIMARY KEY ("id_currency")
);

-- CreateTable
CREATE TABLE "position" (
    "id_position" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "position_pkey" PRIMARY KEY ("id_position")
);

-- CreateTable
CREATE TABLE "type_product" (
    "id_type_product" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "type_product_pkey" PRIMARY KEY ("id_type_product")
);

-- CreateTable
CREATE TABLE "product" (
    "id_product" SERIAL NOT NULL,
    "id_company" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "id_type_product" INTEGER,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id_product")
);

-- CreateTable
CREATE TABLE "product_percentaje_commision" (
    "id_product_percentaje_commision" SERIAL NOT NULL,
    "id_product" INTEGER NOT NULL,
    "id_origin" INTEGER NOT NULL,
    "id_category" INTEGER NOT NULL,
    "code" VARCHAR(50),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_percentaje_commision_pkey" PRIMARY KEY ("id_product_percentaje_commision")
);

-- CreateTable
CREATE TABLE "product_percentaje_commision_position" (
    "id" SERIAL NOT NULL,
    "id_position" INTEGER NOT NULL,
    "id_product_percentaje_commision" INTEGER NOT NULL,
    "porcentaje_distribucion" DECIMAL(5,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_percentaje_commision_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id_user" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "last_name" VARCHAR(150),
    "type_identity" VARCHAR(10) NOT NULL DEFAULT 'CC',
    "identity_number" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150),
    "phone" VARCHAR(30),
    "id_type_user" INTEGER NOT NULL,
    "id_categoria" INTEGER,
    "id_user_leader" INTEGER,
    "entry_date" DATE NOT NULL,
    "retirement_date" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "client" (
    "id_client" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "last_name" VARCHAR(200),
    "type_identity" VARCHAR(10) NOT NULL DEFAULT 'CC',
    "identity_number" VARCHAR(20) NOT NULL,
    "id_client_origin" INTEGER NOT NULL,
    "email" VARCHAR(150),
    "phone" VARCHAR(30),
    "direcction" VARCHAR(255),
    "city" VARCHAR(100),
    "country" VARCHAR(50) NOT NULL DEFAULT 'Colombia',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id_client")
);

-- CreateTable
CREATE TABLE "file_import" (
    "id_file_import" SERIAL NOT NULL,
    "name_file" VARCHAR(255) NOT NULL,
    "load_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_user" INTEGER NOT NULL,
    "total_record" INTEGER NOT NULL DEFAULT 0,
    "success_record" INTEGER NOT NULL DEFAULT 0,
    "error_record" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_import_pkey" PRIMARY KEY ("id_file_import")
);

-- CreateTable
CREATE TABLE "business" (
    "id_business" SERIAL NOT NULL,
    "contract" VARCHAR(100),
    "term" INTEGER,
    "value" DECIMAL(15,2) NOT NULL,
    "observations" TEXT,
    "id_buy_periodicity" INTEGER,
    "id_user" INTEGER NOT NULL,
    "id_client" INTEGER NOT NULL,
    "id_product_percentaje_commision" INTEGER NOT NULL,
    "id_currency" INTEGER NOT NULL,
    "status" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_pkey" PRIMARY KEY ("id_business")
);

-- CreateTable
CREATE TABLE "settlement_commission" (
    "id_settlement_commission" SERIAL NOT NULL,
    "id_business" INTEGER NOT NULL,
    "date_liquidation" TIMESTAMP(3),
    "value_base" DECIMAL(15,2) NOT NULL,
    "comission_valor" DECIMAL(15,2),
    "comission_date_from" INTEGER,
    "comission_date_until" DATE,
    "period" VARCHAR(50),
    "is_lag" BOOLEAN NOT NULL DEFAULT true,
    "date_sync" DATE,
    "status" VARCHAR(20) NOT NULL,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlement_commission_pkey" PRIMARY KEY ("id_settlement_commission")
);

-- CreateTable
CREATE TABLE "lag_commission" (
    "id_lag_commisnion" SERIAL NOT NULL,
    "date_liquidation" TIMESTAMP(3),
    "value_base" DECIMAL(15,2) NOT NULL,
    "comission_valor" DECIMAL(15,2),
    "comission_date_from" INTEGER,
    "comission_date_until" DATE,
    "period" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lag_commission_pkey" PRIMARY KEY ("id_lag_commisnion")
);

-- CreateTable
CREATE TABLE "comission_distribution" (
    "id_comission_distribution" SERIAL NOT NULL,
    "id_settlement_comission" INTEGER NOT NULL,
    "id_percentaje_comission" INTEGER,
    "value_comission" DECIMAL(15,2) NOT NULL,
    "value_comission_final" DECIMAL(15,2) NOT NULL,
    "observation" TEXT,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comission_distribution_pkey" PRIMARY KEY ("id_comission_distribution")
);

-- CreateTable
CREATE TABLE "user_comission_distribution" (
    "id_user_comission_distribution" SERIAL NOT NULL,
    "id_user" INTEGER NOT NULL,
    "id_comission_distribution" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_comission_distribution_pkey" PRIMARY KEY ("id_user_comission_distribution")
);

-- CreateTable
CREATE TABLE "clawback" (
    "id_clawback" SERIAL NOT NULL,
    "id_user_commission_distribution" INTEGER NOT NULL,
    "value_clawback" DECIMAL(15,2) NOT NULL,
    "porcentaje_applied" DECIMAL(5,4) NOT NULL,
    "state" VARCHAR(20) NOT NULL,
    "applied_date" DATE,
    "release_date" DATE,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clawback_pkey" PRIMARY KEY ("id_clawback")
);

-- CreateIndex
CREATE INDEX "company_id_type_company_idx" ON "company"("id_type_company");

-- CreateIndex
CREATE UNIQUE INDEX "category_code_key" ON "category"("code");

-- CreateIndex
CREATE INDEX "category_type_category_idx" ON "category"("type_category");

-- CreateIndex
CREATE INDEX "product_id_company_idx" ON "product"("id_company");

-- CreateIndex
CREATE UNIQUE INDEX "product_id_company_name_key" ON "product"("id_company", "name");

-- CreateIndex
CREATE INDEX "product_percentaje_commision_id_product_idx" ON "product_percentaje_commision"("id_product");

-- CreateIndex
CREATE INDEX "product_percentaje_commision_id_origin_idx" ON "product_percentaje_commision"("id_origin");

-- CreateIndex
CREATE INDEX "product_percentaje_commision_id_category_idx" ON "product_percentaje_commision"("id_category");

-- CreateIndex
CREATE INDEX "product_percentaje_commision_position_id_position_idx" ON "product_percentaje_commision_position"("id_position");

-- CreateIndex
CREATE INDEX "product_percentaje_commision_position_id_product_percentaje_idx" ON "product_percentaje_commision_position"("id_product_percentaje_commision");

-- CreateIndex
CREATE INDEX "user_type_identity_idx" ON "user"("type_identity");

-- CreateIndex
CREATE INDEX "user_id_user_leader_idx" ON "user"("id_user_leader");

-- CreateIndex
CREATE UNIQUE INDEX "user_type_identity_identity_number_key" ON "user"("type_identity", "identity_number");

-- CreateIndex
CREATE INDEX "client_identity_number_idx" ON "client"("identity_number");

-- CreateIndex
CREATE UNIQUE INDEX "client_type_identity_identity_number_key" ON "client"("type_identity", "identity_number");

-- CreateIndex
CREATE INDEX "file_import_load_date_idx" ON "file_import"("load_date");

-- CreateIndex
CREATE UNIQUE INDEX "business_contract_key" ON "business"("contract");

-- CreateIndex
CREATE INDEX "business_id_user_idx" ON "business"("id_user");

-- CreateIndex
CREATE INDEX "business_contract_idx" ON "business"("contract");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_commission_id_business_key" ON "settlement_commission"("id_business");

-- CreateIndex
CREATE INDEX "settlement_commission_status_idx" ON "settlement_commission"("status");

-- CreateIndex
CREATE INDEX "settlement_commission_period_idx" ON "settlement_commission"("period");

-- CreateIndex
CREATE INDEX "lag_commission_status_idx" ON "lag_commission"("status");

-- CreateIndex
CREATE INDEX "lag_commission_period_idx" ON "lag_commission"("period");

-- CreateIndex
CREATE INDEX "comission_distribution_id_settlement_comission_idx" ON "comission_distribution"("id_settlement_comission");

-- CreateIndex
CREATE INDEX "user_comission_distribution_id_comission_distribution_idx" ON "user_comission_distribution"("id_comission_distribution");

-- CreateIndex
CREATE INDEX "user_comission_distribution_id_user_idx" ON "user_comission_distribution"("id_user");

-- CreateIndex
CREATE INDEX "clawback_state_idx" ON "clawback"("state");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_id_company_fkey" FOREIGN KEY ("id_company") REFERENCES "company"("id_company") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_id_type_product_fkey" FOREIGN KEY ("id_type_product") REFERENCES "type_product"("id_type_product") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_percentaje_commision" ADD CONSTRAINT "product_percentaje_commision_id_product_fkey" FOREIGN KEY ("id_product") REFERENCES "product"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_percentaje_commision" ADD CONSTRAINT "product_percentaje_commision_id_origin_fkey" FOREIGN KEY ("id_origin") REFERENCES "product_origin"("id_origin") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_percentaje_commision" ADD CONSTRAINT "product_percentaje_commision_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "category"("id_category") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_percentaje_commision_position" ADD CONSTRAINT "product_percentaje_commision_position_id_position_fkey" FOREIGN KEY ("id_position") REFERENCES "position"("id_position") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_percentaje_commision_position" ADD CONSTRAINT "product_percentaje_commision_position_id_product_percentaj_fkey" FOREIGN KEY ("id_product_percentaje_commision") REFERENCES "product_percentaje_commision"("id_product_percentaje_commision") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_id_type_user_fkey" FOREIGN KEY ("id_type_user") REFERENCES "type_user"("id_type_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "category"("id_category") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_id_user_leader_fkey" FOREIGN KEY ("id_user_leader") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_id_client_origin_fkey" FOREIGN KEY ("id_client_origin") REFERENCES "client_origin"("id_client_origin") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_import" ADD CONSTRAINT "file_import_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_id_client_fkey" FOREIGN KEY ("id_client") REFERENCES "client"("id_client") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_id_product_percentaje_commision_fkey" FOREIGN KEY ("id_product_percentaje_commision") REFERENCES "product_percentaje_commision"("id_product_percentaje_commision") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_id_currency_fkey" FOREIGN KEY ("id_currency") REFERENCES "currency"("id_currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_id_buy_periodicity_fkey" FOREIGN KEY ("id_buy_periodicity") REFERENCES "buy_periodicity"("id_buy_periodicity") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_commission" ADD CONSTRAINT "settlement_commission_id_business_fkey" FOREIGN KEY ("id_business") REFERENCES "business"("id_business") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comission_distribution" ADD CONSTRAINT "comission_distribution_id_settlement_comission_fkey" FOREIGN KEY ("id_settlement_comission") REFERENCES "settlement_commission"("id_settlement_commission") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comission_distribution" ADD CONSTRAINT "comission_distribution_id_percentaje_comission_fkey" FOREIGN KEY ("id_percentaje_comission") REFERENCES "product_percentaje_commision_position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_comission_distribution" ADD CONSTRAINT "user_comission_distribution_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_comission_distribution" ADD CONSTRAINT "user_comission_distribution_id_comission_distribution_fkey" FOREIGN KEY ("id_comission_distribution") REFERENCES "comission_distribution"("id_comission_distribution") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clawback" ADD CONSTRAINT "clawback_id_user_commission_distribution_fkey" FOREIGN KEY ("id_user_commission_distribution") REFERENCES "user_comission_distribution"("id_user_comission_distribution") ON DELETE RESTRICT ON UPDATE CASCADE;
