-- Granted, per person: read-only view of lead states and CRM reports outside the viewer's branch.
ALTER TABLE "user" ADD COLUMN "can_view_others_crm" BOOLEAN NOT NULL DEFAULT false;
