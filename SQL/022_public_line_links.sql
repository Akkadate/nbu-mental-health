-- 022_public_line_links.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.line_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  line_user_id varchar(64) NOT NULL UNIQUE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  consent_version varchar(32) NOT NULL DEFAULT 'v1',
  consented_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_line_links_student ON public.line_links(student_id);
CREATE INDEX IF NOT EXISTS idx_line_links_student ON public.line_links(student_id);

COMMIT;