-- Editable default distribution template. Product creates copy these rows.
-- Existing product distributions are not updated by this migration.

CREATE TABLE "default_distribution_percentage" (
    "id_default_distribution_percentage" SERIAL NOT NULL,
    "id_config_level" INTEGER NOT NULL,
    "id_receiver_level" INTEGER NOT NULL,
    "percentage" DECIMAL(8,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_distribution_percentage_pkey" PRIMARY KEY ("id_default_distribution_percentage")
);

CREATE UNIQUE INDEX "default_distribution_level_pair_key"
ON "default_distribution_percentage"("id_config_level", "id_receiver_level");

CREATE INDEX "default_distribution_config_level_idx"
ON "default_distribution_percentage"("id_config_level");

CREATE INDEX "default_distribution_receiver_level_idx"
ON "default_distribution_percentage"("id_receiver_level");

ALTER TABLE "default_distribution_percentage"
ADD CONSTRAINT "default_distribution_percentage_id_config_level_fkey"
FOREIGN KEY ("id_config_level") REFERENCES "level"("id_level") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "default_distribution_percentage"
ADD CONSTRAINT "default_distribution_percentage_id_receiver_level_fkey"
FOREIGN KEY ("id_receiver_level") REFERENCES "level"("id_level") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "default_distribution_percentage" ("id_config_level", "id_receiver_level", "percentage", "updated_at")
SELECT cfg.id_level, recv.id_level, v.percentage, CURRENT_TIMESTAMP
FROM (
    VALUES
        ('LEVEL_0', 'LEVEL_5', 0.008500::numeric),
        ('LEVEL_0', 'LEVEL_4', 0.017000::numeric),
        ('LEVEL_0', 'LEVEL_3', 0.025500::numeric),
        ('LEVEL_0', 'LEVEL_2', 0.034000::numeric),
        ('LEVEL_0', 'LEVEL_1', 0.085000::numeric),
        ('LEVEL_0', 'LEVEL_0', 0.600000::numeric),
        ('LEVEL_1', 'LEVEL_5', 0.017000::numeric),
        ('LEVEL_1', 'LEVEL_4', 0.025500::numeric),
        ('LEVEL_1', 'LEVEL_3', 0.034000::numeric),
        ('LEVEL_1', 'LEVEL_2', 0.085000::numeric),
        ('LEVEL_1', 'LEVEL_1', 0.600000::numeric),
        ('LEVEL_2', 'LEVEL_5', 0.025500::numeric),
        ('LEVEL_2', 'LEVEL_4', 0.034000::numeric),
        ('LEVEL_2', 'LEVEL_3', 0.085000::numeric),
        ('LEVEL_2', 'LEVEL_2', 0.600000::numeric),
        ('LEVEL_3', 'LEVEL_5', 0.034000::numeric),
        ('LEVEL_3', 'LEVEL_4', 0.085000::numeric),
        ('LEVEL_3', 'LEVEL_3', 0.600000::numeric),
        ('LEVEL_4', 'LEVEL_5', 0.085000::numeric),
        ('LEVEL_4', 'LEVEL_4', 0.600000::numeric),
        ('LEVEL_5', 'LEVEL_5', 0.600000::numeric)
) AS v(config_code, receiver_code, percentage)
JOIN "level" cfg ON cfg.code = v.config_code
JOIN "level" recv ON recv.code = v.receiver_code;
