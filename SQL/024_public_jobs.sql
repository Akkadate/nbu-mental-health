-- 024_public_jobs.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type varchar(64) NOT NULL,
  payload jsonb NOT NULL,
  run_at timestamptz NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending', -- pending/running/success/failed
  locked_by varchar(64),
  locked_at timestamptz,
  retry_count int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_due ON public.jobs(status, run_at);
CREATE INDEX IF NOT EXISTS idx_jobs_locked ON public.jobs(locked_by, locked_at);

COMMIT;