-- 021_public_students.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_code varchar(32) UNIQUE NOT NULL, -- รหัสนักศึกษา
  faculty varchar(128) NOT NULL,
  year int NOT NULL CHECK (year >= 1 AND year <= 10),
  status varchar(16) NOT NULL DEFAULT 'active', -- active/inactive
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_faculty ON public.students(faculty);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

COMMIT;