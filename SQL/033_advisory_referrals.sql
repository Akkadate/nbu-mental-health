-- 033_advisory_referrals.sql
BEGIN;

CREATE TABLE IF NOT EXISTS advisory.referrals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  from_advisor_id uuid NOT NULL REFERENCES advisory.advisors(id) ON DELETE CASCADE,
  priority varchar(16) NOT NULL DEFAULT 'normal', -- low/normal/high
  reason_category varchar(64) NOT NULL, -- e.g., academic_stress, attendance, etc.
  note text, -- must not include clinical scores
  status varchar(16) NOT NULL DEFAULT 'open', -- open/accepted/closed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_status ON advisory.referrals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_student ON advisory.referrals(student_id, created_at DESC);

COMMIT;