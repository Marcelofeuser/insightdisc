ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "company_name" TEXT,
  ADD COLUMN IF NOT EXISTS "logo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "brand_primary_color" TEXT,
  ADD COLUMN IF NOT EXISTS "brand_secondary_color" TEXT,
  ADD COLUMN IF NOT EXISTS "report_footer_text" TEXT;
