-- Comments written on a CRM task from the activities board.
CREATE TABLE "lead_task_comment" (
  "id_lead_task_comment" SERIAL NOT NULL,
  "id_lead_task" INTEGER NOT NULL,
  "author_id" INTEGER NOT NULL,
  "body" VARCHAR(2000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_task_comment_pkey" PRIMARY KEY ("id_lead_task_comment")
);
CREATE INDEX "lead_task_comment_id_lead_task_created_at_idx" ON "lead_task_comment"("id_lead_task", "created_at");
ALTER TABLE "lead_task_comment" ADD CONSTRAINT "lead_task_comment_id_lead_task_fkey" FOREIGN KEY ("id_lead_task") REFERENCES "lead_task"("id_lead_task") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_task_comment" ADD CONSTRAINT "lead_task_comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
