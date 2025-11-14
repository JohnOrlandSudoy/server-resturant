-- Migration: 20251114_add_sales_indexes_constraints.sql
-- Purpose: add indexes and safety constraints for sales_records and weekly_best_sellers
-- Note: This migration is written to be safe to run multiple times. Some ALTER TABLE ADD CONSTRAINT operations
-- are executed inside DO blocks which check pg_constraint to avoid duplicate constraint errors.

BEGIN;

-- Ensure uuid extension (used elsewhere in the schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------
-- Indexes for sales_records
-- -----------------------------
CREATE INDEX IF NOT EXISTS idx_sales_records_week_year
  ON public.sales_records (week_number, year_number);

CREATE INDEX IF NOT EXISTS idx_sales_records_sale_date
  ON public.sales_records (sale_date);

CREATE INDEX IF NOT EXISTS idx_sales_records_menu_item
  ON public.sales_records (menu_item_id);

CREATE INDEX IF NOT EXISTS idx_sales_records_payment_status_method
  ON public.sales_records (payment_status, payment_method);

CREATE INDEX IF NOT EXISTS idx_sales_records_order_id
  ON public.sales_records (order_id);

-- -----------------------------
-- Indexes for weekly_best_sellers
-- -----------------------------
CREATE INDEX IF NOT EXISTS idx_weekly_best_week_rank
  ON public.weekly_best_sellers (week_number, year_number, rank);

CREATE INDEX IF NOT EXISTS idx_weekly_best_week_year
  ON public.weekly_best_sellers (week_number, year_number);

-- -----------------------------
-- Unique constraint: prevent duplicates of same menu_item in same week/year
-- Use a named constraint; add only if it does not already exist
-- -----------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_weekly_best_week_item'
  ) THEN
    ALTER TABLE public.weekly_best_sellers
      ADD CONSTRAINT uq_weekly_best_week_item UNIQUE (week_number, year_number, menu_item_id);
  END IF;
END
$$;

-- -----------------------------
-- Numeric and sanity CHECKs for sales_records
-- -----------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_quantity_nonnegative') THEN
    ALTER TABLE public.sales_records ADD CONSTRAINT chk_sales_quantity_nonnegative CHECK (quantity >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_total_amount_nonnegative') THEN
    ALTER TABLE public.sales_records ADD CONSTRAINT chk_sales_total_amount_nonnegative CHECK (total_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_unit_price_nonnegative') THEN
    ALTER TABLE public.sales_records ADD CONSTRAINT chk_sales_unit_price_nonnegative CHECK (unit_price >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_net_amount_nonnegative') THEN
    ALTER TABLE public.sales_records ADD CONSTRAINT chk_sales_net_amount_nonnegative CHECK (net_amount >= 0);
  END IF;
END
$$;

-- -----------------------------
-- Numeric and sanity CHECKs for weekly_best_sellers
-- -----------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_weekly_total_quantity_nonnegative') THEN
    ALTER TABLE public.weekly_best_sellers ADD CONSTRAINT chk_weekly_total_quantity_nonnegative CHECK (total_quantity_sold >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_weekly_rank_positive') THEN
    ALTER TABLE public.weekly_best_sellers ADD CONSTRAINT chk_weekly_rank_positive CHECK (rank > 0);
  END IF;
END
$$;

-- -----------------------------
-- Optional: restrict payment_status and payment_method values (safe if values match codebase)
-- These checks are optional; if your application already enforces enums or different value sets, skip them.
-- -----------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_status_values') THEN
    ALTER TABLE public.sales_records ADD CONSTRAINT chk_payment_status_values CHECK (
      payment_status IN ('paid','unpaid','refunded','pending','failed','cancelled')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_method_values') THEN
    ALTER TABLE public.sales_records ADD CONSTRAINT chk_payment_method_values CHECK (
      payment_method IN ('cash','gcash','card','paymongo','qrph') OR payment_method IS NULL
    );
  END IF;
END
$$;

-- -----------------------------
-- Notes / Warnings:
-- - If existing data violates a new constraint, the ALTER ... ADD CONSTRAINT will fail.
--   In that case, you must clean or fix the data before re-running this migration (see comment below).
-- - CREATE INDEX IF NOT EXISTS will be skipped if the index already exists.
-- - Unique constraint added for weekly_best_sellers will prevent duplicate rows; use UPSERT or DELETE+INSERT in ETL jobs.
-- -----------------------------

COMMIT;

-- -----------------------------
-- Troubleshooting notes (run manually if migration fails):
-- 1) To find rows violating a constraint before adding it (example for quantity >= 0):
--    SELECT * FROM public.sales_records WHERE quantity < 0 LIMIT 100;
-- 2) To remove duplicates before creating the unique constraint on weekly_best_sellers:
--    DELETE FROM public.weekly_best_sellers a
--    USING (
--      SELECT min(id) as keep_id, week_number, year_number, menu_item_id
--      FROM public.weekly_best_sellers
--      GROUP BY week_number, year_number, menu_item_id
--      HAVING count(*) > 1
--    ) b
--    WHERE a.week_number = b.week_number
--      AND a.year_number = b.year_number
--      AND a.menu_item_id = b.menu_item_id
--      AND a.id <> b.keep_id;
-- -----------------------------
