-- 092_students_plain_fields.sql
-- เพิ่มคอลัมน์เก็บข้อมูลแบบ plain text เพื่อให้ admin ตรวจสอบ/แก้ไขได้
-- (hash columns ยังคงอยู่เพื่อใช้ใน link-line verification)

BEGIN;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS dob date,              -- วันเกิด เช่น 2002-05-15
  ADD COLUMN IF NOT EXISTS id_card varchar(20),   -- เลขบัตรประชาชน 13 หลัก (นศ. ไทย)
  ADD COLUMN IF NOT EXISTS passport_no varchar(20); -- เลข Passport (นศ. ต่างชาติ)

COMMIT;
