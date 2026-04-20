-- RF-05: persist up to 6 fractional digits for category distribution and portfolio (fraction 0-1 scale).
ALTER TABLE "product_percentaje_commision_category"
  ALTER COLUMN "porcentaje_distribucion" SET DATA TYPE DECIMAL(8, 6);

ALTER TABLE "product_percentaje_commision_category"
  ALTER COLUMN "porcentaje_portfolio" SET DATA TYPE DECIMAL(8, 6);
