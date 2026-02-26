-- 043_clinical_screenings.sql
BEGIN;

CREATE TABLE IF NOT EXISTS clinical.screenings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type varchar(32) NOT NULL, -- stress_mini/phq9_gad7
  intent varchar(32), -- academic/stress/relationship/sleep/other/unsure
  answers_json jsonb,
  phq9_score int,
  gad7_score int,
  stress_score int,
  risk_level risk_level_enum NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screenings_student_time ON clinical.screenings(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_risk_time ON clinical.screenings(risk_level, created_at DESC);

COMMIT;