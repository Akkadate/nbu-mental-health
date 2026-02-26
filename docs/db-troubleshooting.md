# Database Troubleshooting — SQL Quick Reference

PostgreSQL schemas: `public`, `advisory`, `clinical`, `analytics`

---

## 1. Users & Auth

```sql
-- ดู staff ทั้งหมด
SELECT id, role, email, name, is_active, created_at
FROM public.users
ORDER BY role, created_at;

-- ดู staff พร้อม LINE user ID
SELECT u.id, u.role, u.email, u.name, u.is_active,
       ll.line_user_id, ll.linked_at
FROM public.users u
LEFT JOIN public.line_links ll ON ll.student_id = u.id
ORDER BY u.role;

-- ดู advisor profiles
SELECT u.email, u.name, a.id AS advisor_id, a.faculty
FROM advisory.advisors a
JOIN public.users u ON u.id = a.user_id;

-- ดู counselor profiles
SELECT u.email, u.name, c.id AS counselor_id
FROM clinical.counselors c
JOIN public.users u ON u.id = c.user_id;

-- users ที่ยังไม่มี advisor/counselor profile (อาจทำให้ 403)
SELECT u.id, u.email, u.role
FROM public.users u
LEFT JOIN advisory.advisors a ON a.user_id = u.id
WHERE u.role = 'advisor' AND a.id IS NULL;

SELECT u.id, u.email, u.role
FROM public.users u
LEFT JOIN clinical.counselors c ON c.user_id = u.id
WHERE u.role = 'counselor' AND c.id IS NULL;
```

---

## 2. Students & LINE Linking

```sql
-- ดูนักศึกษาทั้งหมด
SELECT id, student_code, faculty, year, status
FROM public.students
ORDER BY student_code;

-- ดูนักศึกษาที่ผูก LINE แล้ว
SELECT s.student_code, s.faculty, l.line_user_id, l.linked_at, l.consent_version
FROM public.students s
JOIN public.line_links l ON l.student_id = s.id
ORDER BY l.linked_at DESC;

-- ดูนักศึกษาที่ยังไม่ผูก LINE
SELECT s.student_code, s.faculty, s.status
FROM public.students s
LEFT JOIN public.line_links l ON l.student_id = s.id
WHERE l.id IS NULL;

-- ค้นหา LINE user จาก student_code
SELECT s.student_code, l.line_user_id, l.linked_at
FROM public.students s
JOIN public.line_links l ON l.student_id = s.id
WHERE s.student_code = '65XXXXXXX';

-- ค้นหา student จาก LINE user ID
SELECT s.student_code, s.faculty, l.line_user_id
FROM public.line_links l
JOIN public.students s ON s.id = l.student_id
WHERE l.line_user_id = 'Uxxxxxxxx';
```

---

## 3. Slots

```sql
-- ดู advisory slots ทั้งหมด
SELECT s.id, a.user_id, u.name AS advisor_name,
       s.start_at, s.end_at, s.is_available
FROM advisory.slots s
JOIN advisory.advisors a ON a.id = s.advisor_id
JOIN public.users u ON u.id = a.user_id
ORDER BY s.start_at;

-- ดูเฉพาะ slots ที่ว่าง (advisory)
SELECT s.id, u.name AS advisor_name, s.start_at, s.end_at
FROM advisory.slots s
JOIN advisory.advisors a ON a.id = s.advisor_id
JOIN public.users u ON u.id = a.user_id
WHERE s.is_available = true
ORDER BY s.start_at;

-- ดู clinical slots ทั้งหมด
SELECT s.id, u.name AS counselor_name,
       s.start_at, s.end_at, s.is_available
FROM clinical.slots s
JOIN clinical.counselors c ON c.id = s.counselor_id
JOIN public.users u ON u.id = c.user_id
ORDER BY s.start_at;

-- นับ slots ว่างของแต่ละ advisor
SELECT u.name, COUNT(*) AS available_slots
FROM advisory.slots s
JOIN advisory.advisors a ON a.id = s.advisor_id
JOIN public.users u ON u.id = a.user_id
WHERE s.is_available = true
GROUP BY u.name;
```

---

## 4. Appointments

```sql
-- ดู advisory appointments ล่าสุด
SELECT ap.id, s.student_code, u.name AS advisor_name,
       ap.scheduled_at, ap.mode, ap.status, ap.created_at
FROM advisory.appointments ap
JOIN public.students s ON s.id = ap.student_id
JOIN advisory.advisors a ON a.id = ap.advisor_id
JOIN public.users u ON u.id = a.user_id
ORDER BY ap.scheduled_at DESC
LIMIT 20;

-- ดู clinical appointments ล่าสุด
SELECT ap.id, s.student_code, u.name AS counselor_name,
       ap.scheduled_at, ap.mode, ap.status, ap.created_at
FROM clinical.appointments ap
JOIN public.students s ON s.id = ap.student_id
JOIN clinical.counselors c ON c.id = ap.counselor_id
JOIN public.users u ON u.id = c.user_id
ORDER BY ap.scheduled_at DESC
LIMIT 20;

-- นับ appointments แยกตาม status
SELECT status, COUNT(*) FROM advisory.appointments GROUP BY status;
SELECT status, COUNT(*) FROM clinical.appointments GROUP BY status;
```

---

## 5. Screenings & Cases

```sql
-- ดู screenings ล่าสุด (ไม่มี answers_json เพื่อความปลอดภัย)
SELECT sc.id, s.student_code, sc.type,
       sc.phq9_score, sc.gad7_score, sc.stress_score,
       sc.risk_level, sc.created_at
FROM clinical.screenings sc
JOIN public.students s ON s.id = sc.student_id
ORDER BY sc.created_at DESC
LIMIT 20;

-- นับ screening แยกตาม risk_level
SELECT risk_level, COUNT(*) AS total
FROM clinical.screenings
GROUP BY risk_level
ORDER BY CASE risk_level
    WHEN 'crisis' THEN 1
    WHEN 'high' THEN 2
    WHEN 'moderate' THEN 3
    WHEN 'low' THEN 4
END;

-- ดู open cases
SELECT cs.id, s.student_code, cs.priority, cs.status,
       u.name AS counselor_name, cs.created_at
FROM clinical.cases cs
JOIN public.students s ON s.id = cs.student_id
LEFT JOIN clinical.counselors c ON c.id = cs.assigned_counselor_id
LEFT JOIN public.users u ON u.id = c.user_id
WHERE cs.status NOT IN ('closed')
ORDER BY CASE cs.priority WHEN 'crisis' THEN 1 WHEN 'high' THEN 2 END,
         cs.created_at;

-- ดู cases ทั้งหมดพร้อมสถานะ
SELECT cs.priority, cs.status, COUNT(*) AS total
FROM clinical.cases cs
GROUP BY cs.priority, cs.status
ORDER BY cs.priority, cs.status;
```

---

## 6. Jobs (Background Queue)

```sql
-- ดู pending jobs
SELECT id, type, run_at, retry_count, created_at
FROM public.jobs
WHERE status = 'pending'
ORDER BY run_at;

-- ดู failed jobs
SELECT id, type, last_error, retry_count, created_at
FROM public.jobs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- ดู jobs ทั้งหมดแยก status
SELECT status, type, COUNT(*) AS total
FROM public.jobs
GROUP BY status, type
ORDER BY status, type;

-- ดู jobs ที่ค้างนาน (running > 10 นาที อาจ crash)
SELECT id, type, status, run_at, created_at
FROM public.jobs
WHERE status = 'running'
  AND created_at < NOW() - INTERVAL '10 minutes';
```

---

## 7. Audit Log

```sql
-- ดู audit log ล่าสุด
SELECT al.action, al.object_type, al.object_id,
       u.email AS actor_email, al.ip, al.created_at
FROM public.audit_log al
LEFT JOIN public.users u ON u.id = al.actor_user_id
ORDER BY al.created_at DESC
LIMIT 50;

-- ดู audit log ของ action ที่ sensitive
SELECT al.action, al.object_type, u.email, al.ip, al.created_at
FROM public.audit_log al
LEFT JOIN public.users u ON u.id = al.actor_user_id
WHERE al.action IN ('view_case', 'read_screening', 'write_note', 'export_analytics')
ORDER BY al.created_at DESC;
```

---

## 8. Analytics

```sql
-- ดู daily metrics ล่าสุด
SELECT metric_date, faculty,
       risk_low_count, risk_mod_count, risk_high_count, risk_crisis_count,
       advisor_appt_count, counselor_appt_count
FROM analytics.daily_metrics
ORDER BY metric_date DESC, faculty
LIMIT 30;

-- สรุปรวมทั้งหมด
SELECT
    SUM(risk_low_count)    AS total_low,
    SUM(risk_mod_count)    AS total_moderate,
    SUM(risk_high_count)   AS total_high,
    SUM(risk_crisis_count) AS total_crisis
FROM analytics.daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days';
```

---

## 9. Quick Fixes (Manual SQL)

```sql
-- เพิ่ม advisor profile ให้ user ที่ขาด (แทน user_id ด้วย UUID จริง)
INSERT INTO advisory.advisors (user_id, name, faculty)
SELECT id, name, NULL FROM public.users
WHERE role = 'advisor'
  AND id NOT IN (SELECT user_id FROM advisory.advisors);

-- เพิ่ม counselor profile ให้ user ที่ขาด
INSERT INTO clinical.counselors (user_id, name)
SELECT id, name FROM public.users
WHERE role = 'counselor'
  AND id NOT IN (SELECT user_id FROM clinical.counselors);

-- ปิดใช้งาน user
UPDATE public.users SET is_active = false WHERE email = 'user@example.com';

-- ลบ slot ที่ยังว่าง (กรณีต้องการล้าง)
DELETE FROM advisory.slots WHERE is_available = true AND start_at < NOW();

-- reset job ที่ค้างใน running กลับเป็น pending
UPDATE public.jobs SET status = 'pending'
WHERE status = 'running'
  AND created_at < NOW() - INTERVAL '10 minutes';
```

---

## 10. Connection (psql)

```bash
# เข้า psql บนเซิร์ฟเวอร์
psql -U postgres -d nbu_mental_health

# หรือถ้าใช้ user เฉพาะ
psql -U nbu_app -d nbu_mental_health -h localhost

# ดู schemas
\dn

# ดู tables ใน schema
\dt advisory.*
\dt clinical.*
\dt public.*

# ดู columns ของ table
\d advisory.slots
\d clinical.cases
```

---

## 11. Run SQL จาก Terminal (One-liner)

รันคำสั่ง SQL โดยไม่ต้องเข้า psql interactive mode:

```bash
# รูปแบบพื้นฐาน
psql -U postgres -d nbu_mental_health -c "SELECT ..."

# ถ้าต้องใส่ password ทุกครั้ง ให้ตั้ง env ก่อน
export PGPASSWORD='your_db_password'
psql -U postgres -d nbu_mental_health -c "SELECT ..."
```

### ตัวอย่างคำสั่งพร้อมใช้ (copy-paste ได้เลย)

```bash
# ดู staff users ทั้งหมด
psql -U postgres -d nbu_mental_health -c \
  "SELECT id, role, email, name, is_active FROM public.users ORDER BY role;"

# ดู advisor ที่ขาด profile (ทำให้ 403)
psql -U postgres -d nbu_mental_health -c \
  "SELECT u.id, u.email, u.role FROM public.users u
   LEFT JOIN advisory.advisors a ON a.user_id = u.id
   WHERE u.role = 'advisor' AND a.id IS NULL;"

# ดู counselor ที่ขาด profile
psql -U postgres -d nbu_mental_health -c \
  "SELECT u.id, u.email, u.role FROM public.users u
   LEFT JOIN clinical.counselors c ON c.user_id = u.id
   WHERE u.role = 'counselor' AND c.id IS NULL;"

# เพิ่ม advisor profile ที่ขาดทั้งหมดในครั้งเดียว
psql -U postgres -d nbu_mental_health -c \
  "INSERT INTO advisory.advisors (user_id, name, faculty)
   SELECT id, name, NULL FROM public.users
   WHERE role = 'advisor'
     AND id NOT IN (SELECT user_id FROM advisory.advisors);"

# เพิ่ม counselor profile ที่ขาดทั้งหมด
psql -U postgres -d nbu_mental_health -c \
  "INSERT INTO clinical.counselors (user_id, name)
   SELECT id, name FROM public.users
   WHERE role = 'counselor'
     AND id NOT IN (SELECT user_id FROM clinical.counselors);"

# ดู advisory slots ทั้งหมด
psql -U postgres -d nbu_mental_health -c \
  "SELECT s.id, u.name AS advisor, s.start_at, s.end_at, s.is_available
   FROM advisory.slots s
   JOIN advisory.advisors a ON a.id = s.advisor_id
   JOIN public.users u ON u.id = a.user_id
   ORDER BY s.start_at;"

# ดู clinical slots ทั้งหมด
psql -U postgres -d nbu_mental_health -c \
  "SELECT s.id, u.name AS counselor, s.start_at, s.end_at, s.is_available
   FROM clinical.slots s
   JOIN clinical.counselors c ON c.id = s.counselor_id
   JOIN public.users u ON u.id = c.user_id
   ORDER BY s.start_at;"

# ดู open cases
psql -U postgres -d nbu_mental_health -c \
  "SELECT cs.id, s.student_code, cs.priority, cs.status, cs.created_at
   FROM clinical.cases cs
   JOIN public.students s ON s.id = cs.student_id
   WHERE cs.status != 'closed'
   ORDER BY cs.priority, cs.created_at;"

# ดู pending/failed jobs
psql -U postgres -d nbu_mental_health -c \
  "SELECT id, type, status, run_at, retry_count, last_error
   FROM public.jobs
   WHERE status IN ('pending','failed')
   ORDER BY run_at;"

# reset stuck jobs กลับเป็น pending
psql -U postgres -d nbu_mental_health -c \
  "UPDATE public.jobs SET status = 'pending'
   WHERE status = 'running'
     AND created_at < NOW() - INTERVAL '10 minutes';"

# นับ screening แยก risk level
psql -U postgres -d nbu_mental_health -c \
  "SELECT risk_level, COUNT(*) FROM clinical.screenings GROUP BY risk_level;"

# ดู LINE link ของ student (แทน XXXX ด้วย student_code)
psql -U postgres -d nbu_mental_health -c \
  "SELECT s.student_code, l.line_user_id, l.linked_at
   FROM public.students s JOIN public.line_links l ON l.student_id = s.id
   WHERE s.student_code = 'XXXX';"

# ดู audit log 20 รายการล่าสุด
psql -U postgres -d nbu_mental_health -c \
  "SELECT al.action, al.object_type, u.email, al.ip, al.created_at
   FROM public.audit_log al
   LEFT JOIN public.users u ON u.id = al.actor_user_id
   ORDER BY al.created_at DESC LIMIT 20;"
```

### ดู PM2 & Application Logs

```bash
# ดูสถานะ process ทั้งหมด
pm2 status

# ดู logs แบบ realtime
pm2 logs              # ทุก process
pm2 logs nbu-api      # เฉพาะ API
pm2 logs nbu-admin    # เฉพาะ Admin
pm2 logs nbu-liff     # เฉพาะ LIFF

# ดู logs ย้อนหลัง 200 บรรทัด
pm2 logs nbu-api --lines 200

# restart process
pm2 restart nbu-api
pm2 restart nbu-admin
pm2 restart all

# ดู nginx error log
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

*อัปเดตล่าสุด: 2026-02-26*
