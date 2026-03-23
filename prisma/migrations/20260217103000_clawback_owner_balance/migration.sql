-- AlterTable
ALTER TABLE "clawback" ADD COLUMN "id_user" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "clawback_id_user_idx" ON "clawback"("id_user");

-- AddForeignKey
ALTER TABLE "clawback" ADD CONSTRAINT "clawback_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "clawback_balance" (
    "id_user" INTEGER NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clawback_balance_pkey" PRIMARY KEY ("id_user")
);

-- AddForeignKey
ALTER TABLE "clawback_balance" ADD CONSTRAINT "clawback_balance_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
