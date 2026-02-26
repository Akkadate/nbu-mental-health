-- 091_add_name_faculty_to_users.sql
-- Add name and faculty columns to public.users (required for staff profiles)
BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS name text,
    ADD COLUMN IF NOT EXISTS faculty text;

COMMIT;
