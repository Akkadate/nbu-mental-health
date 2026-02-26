# db_migrations.md — PostgreSQL Schemas, Tables, Constraints, Indexes (Complete)
**System**: Student Mental Health Early Warning Platform (LINE OA-first)  
**DB**: PostgreSQL 15+  
**Goal**: DDL ฉบับสมบูรณ์สำหรับสร้าง DB ตั้งแต่ศูนย์ (ใช้กับ Prisma/Knex/Drizzle ได้)

## Design Principles
- แยกโดเมนด้วย schema: `public`, `advisory`, `clinical`, `analytics`
- UUID เป็น primary key ทุกตารางหลัก
- `timestamptz` สำหรับเวลา
- Clinical note เข้ารหัสที่แอป (AES-256-GCM) เก็บเป็น `encrypted_note`
- ไม่ให้ advisor/admin เข้าถึง clinical tables ผ่าน API (ส่วนนี้ต้องคุมในแอป + role)

---

# 0) Bootstrap / Extensions / Enums
> ไฟล์นี้ตั้งใจให้รันด้วย migration tool ได้ตามลำดับ (suggested order ด้านล่าง)


