-- Migration 094: Add meeting_url to public.users
-- เก็บ Google Meet personal link ของ counselor/advisor
-- ใช้ลิงก์ส่วนตัวที่สร้างครั้งเดียวและใช้ได้ตลอด

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS meeting_url text;

COMMENT ON COLUMN public.users.meeting_url IS 'Google Meet / Zoom personal meeting URL ใช้สำหรับนัดหมาย online';
