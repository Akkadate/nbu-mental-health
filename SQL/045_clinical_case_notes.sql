-- 045_clinical_case_notes.sql
BEGIN;

CREATE TABLE IF NOT EXISTS clinical.case_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES clinical.cases(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL REFERENCES clinical.counselors(id) ON DELETE CASCADE,
  encrypted_note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_case_time ON clinical.case_notes(case_id, created_at DESC);

COMMIT;