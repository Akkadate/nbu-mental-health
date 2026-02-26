-- 031_advisory_slots.sql
BEGIN;

CREATE TABLE IF NOT EXISTS advisory.slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  advisor_id uuid NOT NULL REFERENCES advisory.advisors(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_advisory_slot_time CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_advisory_slots_range ON advisory.slots(advisor_id, start_at);
CREATE INDEX IF NOT EXISTS idx_advisory_slots_available ON advisory.slots(is_available, start_at);

COMMIT;