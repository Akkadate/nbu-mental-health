-- 041_clinical_slots.sql
BEGIN;

CREATE TABLE IF NOT EXISTS clinical.slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id uuid NOT NULL REFERENCES clinical.counselors(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_clinical_slot_time CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_clinical_slots_range ON clinical.slots(counselor_id, start_at);
CREATE INDEX IF NOT EXISTS idx_clinical_slots_available ON clinical.slots(is_available, start_at);

COMMIT;