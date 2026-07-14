-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "business_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "title" VARCHAR(40) NOT NULL,
    "detail" VARCHAR(200) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_business_id_created_at_idx" ON "comment"("business_id", "created_at");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id_business") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
