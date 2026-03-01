-- Migration 093: Add intent column to clinical.screenings
-- เก็บเหตุผลที่นักศึกษาเลือกทำแบบประเมิน สำหรับวิเคราะห์ย้อนหลัง

ALTER TABLE clinical.screenings
    ADD COLUMN IF NOT EXISTS intent text DEFAULT 'unsure';

COMMENT ON COLUMN clinical.screenings.intent IS 'เหตุผลที่ประเมิน: academic/stress/relationship/sleep/other/unsure';
