-- 044_clinical_cases.sql
BEGIN;

CREATE TABLE IF NOT EXISTS clinical.cases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  latest_screening_id uuid REFERENCES clinical.screenings(id) ON DELETE SET NULL,
  priority priority_enum NOT NULL,
  status case_status_enum NOT NULL DEFAULT 'open',
  assigned_counselor_id uuid REFERENCES clinical.counselors(id) ON DELETE SET NULL,
  acked_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_status_priority ON clinical.cases(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_student ON clinical.cases(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_assigned ON clinical.cases(assigned_counselor_id, status);

COMMIT;