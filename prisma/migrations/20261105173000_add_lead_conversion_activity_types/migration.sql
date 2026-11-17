-- Add only append-only conversion audit event values; existing rows and flows remain unchanged.
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'CONVERTED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'BUSINESS_LINKED';
