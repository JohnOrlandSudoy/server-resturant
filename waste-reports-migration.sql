-- Waste reporting table creation for Supabase
-- Run this against a database that already has the schema from supabase.sql

CREATE TABLE IF NOT EXISTS public.waste_reports (
  id uuid primary key default uuid_generate_v4(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients (id),
  order_id uuid REFERENCES public.orders (id),
  quantity numeric NOT NULL,
  unit varchar,
  reason varchar NOT NULL CHECK (
    reason IN (
      'spillage',
      'burn',
      'expiry',
      'quality_issue',
      'over_preparation',
      'spoilage'
    )
  ),
  cost_impact numeric,
  reported_by uuid NOT NULL REFERENCES public.user_profiles (id),
  status varchar NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewed', 'resolved')
  ),
  notes text,
  photo_url varchar,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.user_profiles (id)
);

CREATE INDEX IF NOT EXISTS waste_reports_ingredient_idx ON public.waste_reports (ingredient_id);
CREATE INDEX IF NOT EXISTS waste_reports_reason_idx ON public.waste_reports (reason);
CREATE INDEX IF NOT EXISTS waste_reports_status_idx ON public.waste_reports (status);
CREATE INDEX IF NOT EXISTS waste_reports_created_at_idx ON public.waste_reports (created_at);

