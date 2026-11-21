-- CRM task notices: in-app for today and the anticipation window, email for overdue.
ALTER TABLE "lead_task" ADD COLUMN "advance_notified_at" TIMESTAMP(3);
CREATE INDEX "lead_task_due_at_advance_notified_at_idx" ON "lead_task"("due_at", "advance_notified_at");

CREATE TABLE "crm_notification_setting" (
    "id_crm_notification_setting" INTEGER NOT NULL DEFAULT 1,
    "anticipation_days" INTEGER NOT NULL DEFAULT 1,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_notification_setting_pkey" PRIMARY KEY ("id_crm_notification_setting"),
    CONSTRAINT "crm_notification_setting_anticipation_days_check" CHECK ("anticipation_days" >= 0 AND "anticipation_days" <= 30),
    CONSTRAINT "crm_notification_setting_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "crm_notification_setting" ("id_crm_notification_setting", "anticipation_days", "updated_at")
VALUES (1, 1, CURRENT_TIMESTAMP);
