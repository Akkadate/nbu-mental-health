-- 030_advisory_advisors.sql
BEGIN;

CREATE TABLE IF NOT EXISTS advisory.advisors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  name varchar(256) NOT NULL,
  faculty varchar(128) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisors_faculty ON advisory.advisors(faculty);
CREATE INDEX IF NOT EXISTS idx_advisors_active ON advisory.advisors(is_active);

COMMIT;