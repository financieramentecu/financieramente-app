-- Migration 1.3: Rename level codes from human-readable names to LEVEL_N scheme.
-- These codes drive commission hierarchy logic; renaming makes the tiers explicit.

UPDATE "level" SET code = 'LEVEL_0', name = 'NIVEL 0 (MS Junior)', beneficiary_mode = 'OVERRIDE', id_fixed_beneficiary = null       WHERE code = 'MS_JUNIOR';
UPDATE "level" SET code = 'LEVEL_1', name = 'NIVEL 1 (MS Senior)', beneficiary_mode = 'OVERRIDE', id_fixed_beneficiary = null       WHERE code = 'MS_SENIOR';
UPDATE "level" SET code = 'LEVEL_2', name = 'NIVEL 2 (Team Leader)', beneficiary_mode = 'OVERRIDE', id_fixed_beneficiary = null       WHERE code = 'TEAM_LEADER';
UPDATE "level" SET code = 'LEVEL_3', name = 'NIVEL 3 (Performance Leader)', beneficiary_mode = 'OVERRIDE', id_fixed_beneficiary = null WHERE code = 'PERFORMANCE_LEADER';
UPDATE "level" SET code = 'LEVEL_4', name = 'NIVEL 4 (Business Leader)', beneficiary_mode = 'OVERRIDE', id_fixed_beneficiary = null   WHERE code = 'BUSINESS_LEADER';
UPDATE "level" SET code = 'LEVEL_5', name = 'NIVEL 5 (Partner)', beneficiary_mode = 'OVERRIDE', id_fixed_beneficiary = null           WHERE code = 'PARTNER';
UPDATE "level" SET code = 'LEVEL_6', name = 'NIVEL 6 (MIA)', beneficiary_mode = 'BENEFICIARIO_GENERAL' WHERE code = 'MI';
