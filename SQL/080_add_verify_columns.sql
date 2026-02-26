-- 080_add_verify_columns.sql
-- เพิ่ม columns สำหรับ dual-document identity verification
-- บัตรประชาชน/บัตรชมพู (นศ. ไทย) หรือ Passport (นศ. ต่างชาติ)
-- ข้อมูลเก็บเป็น SHA-256 hash + salt เท่านั้น (ไม่เก็บ plain text)

BEGIN;

-- Enum สำหรับประเภทเอกสาร
DO $$ BEGIN
  CREATE TYPE verify_doc_type_enum AS ENUM ('national_id', 'passport');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- เพิ่ม columns ใน public.students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS dob_hash text,           -- SHA-256(salt + date_of_birth)
  ADD COLUMN IF NOT EXISTS id_card_hash text,        -- SHA-256(salt + เลขบัตร 13 หลัก) nullable
  ADD COLUMN IF NOT EXISTS passport_hash text,       -- SHA-256(salt + passport number) nullable
  ADD COLUMN IF NOT EXISTS verify_doc_type verify_doc_type_enum; -- ประเภทเอกสารที่ใช้ยืนยัน

-- อย่างน้อยต้องมี id_card_hash หรือ passport_hash อันใดอันหนึ่ง
-- (enforce ที่ application layer เพื่อความยืดหยุ่น)

COMMIT;
