-- 061_line_event_dedupe.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.line_event_dedupe (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_event_id varchar(128) NOT NULL UNIQUE,
  received_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;