-- 025_public_resources.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category varchar(64) NOT NULL, -- stress/sleep/anxiety/academic/relationship/other
  title varchar(256) NOT NULL,
  url text,
  content_markdown text,
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_active ON public.resources(is_active);

COMMIT;
