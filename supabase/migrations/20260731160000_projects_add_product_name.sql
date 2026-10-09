-- ═══════════════════════════════════════════════════════════════════════════════
-- Adds an optional product_name column to projects, used by the new
-- "Product Sales" template in the Create Project wizard (and available to
-- any project where naming the product being sold is useful).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS product_name text;
