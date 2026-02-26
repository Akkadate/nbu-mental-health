-- 032_advisory_appointments.sql
BEGIN;

CREATE TABLE IF NOT EXISTS advisory.appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES advisory.advisors(id) ON DELETE CASCADE,
  slot_id uuid UNIQUE REFERENCES advisory.slots(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  mode mode_enum NOT NULL DEFAULT 'onsite',
  status appt_status_enum NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisory_appt_advisor_time ON advisory.appointments(advisor_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisory_appt_student_time ON advisory.appointments(student_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisory_appt_status_time ON advisory.appointments(status, scheduled_at DESC);

COMMIT;
