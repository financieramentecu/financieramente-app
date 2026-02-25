-- Update FileImport states
UPDATE "file_import" SET "status" = 'LOAD' WHERE "status" IN ('PROCESANDO', 'PARCIAL', 'ERROR', 'PRELIQUIDADO');
UPDATE "file_import" SET "status" = 'COMPLETED' WHERE "status" = 'COMPLETADO';

-- Update SettlementCommission states
UPDATE "settlement_commission" SET "status" = 'SYNCHRONIZED' WHERE "status" = 'SINCRONIZADO';
UPDATE "settlement_commission" SET "status" = 'PRE-SETTLED' WHERE "status" = 'PRELIQUIDADO';
UPDATE "settlement_commission" SET "status" = 'SETTLED' WHERE "status" = 'LIQUIDADO';

-- (PENDIENTE implies it's still processing/raw, LAG is already LAG in english)
-- ERROR is also already ERROR in english
