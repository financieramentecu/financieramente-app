-- Migration Reference: mejoras-negocios-aportes-fondeos
-- Phase 1: Schema + DB Migration
--
-- This file is a REFERENCE DOCUMENT for the DB changes required.
-- DO NOT place this file in prisma/migrations/ — Prisma will generate
-- its own migration file when you run `npx prisma migrate dev --name rename_payments`.
--
-- Run order: execute these statements in a single transaction.

BEGIN;

-- 1. Rename the table (atomic in PostgreSQL, preserves PK/FK/indexes)
ALTER TABLE annual_payment RENAME TO payments;

-- 2. Add new column to payments table
ALTER TABLE payments
  ADD COLUMN expected_date TIMESTAMPTZ NULL;

-- 3. Add new column to business table
ALTER TABLE business
  ADD COLUMN num_aportes INTEGER NULL;

-- 4. Backfill num_aportes for existing businesses that already have payments
--    Set num_aportes = count of existing payment rows per business.
--    Businesses with no payments remain NULL (will be calculated on next edit).
UPDATE business b
SET num_aportes = sub.cnt
FROM (
  SELECT id_business, COUNT(*) AS cnt
  FROM payments
  GROUP BY id_business
) AS sub
WHERE b.id_business = sub.id_business;

COMMIT;

-- Rollback (if needed):
--   BEGIN;
--   ALTER TABLE payments RENAME TO annual_payment;
--   ALTER TABLE annual_payment DROP COLUMN expected_date;
--   ALTER TABLE business DROP COLUMN num_aportes;
--   COMMIT;
