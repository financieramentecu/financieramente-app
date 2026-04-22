-- Deprecate COMISIONANDO in favor of LIQUIDADO for business status.
UPDATE "business"
SET "status" = 'LIQUIDADO'
WHERE "status" = 'COMISIONANDO';
