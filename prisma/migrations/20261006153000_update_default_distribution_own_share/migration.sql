-- Leadership route: each config level distributes 77%.
-- Upline overrides stay the same. The level's own share rises so the column sums to 77%.
-- MS Junior (LEVEL_0) already summed to 77% and is unchanged.

UPDATE "default_distribution_percentage" AS distribution
SET
    "percentage" = updated.percentage,
    "updated_at" = CURRENT_TIMESTAMP
FROM (
    VALUES
        ('LEVEL_1', 'LEVEL_1', 0.608500::numeric),
        ('LEVEL_2', 'LEVEL_2', 0.625500::numeric),
        ('LEVEL_3', 'LEVEL_3', 0.651000::numeric),
        ('LEVEL_4', 'LEVEL_4', 0.685000::numeric),
        ('LEVEL_5', 'LEVEL_5', 0.770000::numeric)
) AS updated(config_code, receiver_code, percentage)
JOIN "level" AS config_level ON config_level.code = updated.config_code
JOIN "level" AS receiver_level ON receiver_level.code = updated.receiver_code
WHERE distribution.id_config_level = config_level.id_level
  AND distribution.id_receiver_level = receiver_level.id_level;
