-- Migration 090: Add line_user_id to staff accounts
-- Allows counselors/advisors/supervisors to receive LINE push notifications
-- Staff link their LINE by logging in through LIFF (/link-staff)

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(64) UNIQUE;

COMMENT ON COLUMN public.users.line_user_id
    IS 'LINE userId for push notifications. Set via LIFF /link-staff self-service flow.';
