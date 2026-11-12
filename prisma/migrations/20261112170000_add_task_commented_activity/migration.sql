-- Timeline event for a comment written on a lead task. Existing rows stay unchanged.
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'TASK_COMMENTED';
