-- 042_clinical_appointments.sql
BEGIN;

CREATE TABLE IF NOT EXISTS clinical.appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL REFERENCES clinical.counselors(id) ON DELETE CASCADE,
  slot_id uuid UNIQUE REFERENCES clinical.slots(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  mode mode_enum NOT NULL DEFAULT 'onsite',
  status appt_status_enum NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_appt_counselor_time ON clinical.appointments(counselor_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_appt_student_time ON clinical.appointments(student_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_appt_status_time ON clinical.appointments(status, scheduled_at DESC);

COMMIT;