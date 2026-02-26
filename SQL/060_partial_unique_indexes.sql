-- 060_partial_unique_indexes.sql
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_case_per_student
ON clinical.cases(student_id)
WHERE status IN ('open','acked','contacted','follow_up');

COMMIT;