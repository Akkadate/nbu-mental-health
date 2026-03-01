# Future Development Roadmap

เอกสารนี้รวบรวม feature ที่ยังไม่ได้พัฒนา หรือพัฒนาไม่ครบ สำหรับ NBU Mental Health Platform

---

## Phase 2 Features (ยังไม่ได้ทำ)

### 1. Supervisor Dashboard

**คืออะไร:**
Role `supervisor` ใช้สำหรับรับ escalation เมื่อเคส CRISIS ไม่มี Counselor รับใน 30 นาที

**Flow ที่ออกแบบไว้:**
```
นักศึกษาประเมิน → CRISIS
  → สร้างเคส + แจ้ง Counselor ทาง LINE ทันที
  → [รอ 30 นาที]
  → ถ้า Counselor ยัง ACK ไม่ → แจ้ง Supervisor ทาง LINE
```

**สิ่งที่พร้อมแล้ว (Backend):**
- Escalation job ทำงานอยู่แล้ว (`apps/api/src/worker.ts`)
- Supervisor login ได้ (role มีใน DB และ RBAC)
- Supervisor รับ LINE notification ได้แล้ว

**สิ่งที่ยังต้องทำ:**
- หน้า `/supervisor/cases` — ดู CRISIS cases ที่ยังไม่ถูก ACK
- ฟังก์ชัน assign counselor ให้กับเคส
- อาจรวม route กับ `/counselor/cases` โดย filter priority=crisis + status=open

**ไฟล์ที่เกี่ยวข้อง:**
- `apps/api/src/worker.ts` — handleEscalationCheck()
- `apps/api/src/routes/clinical.ts` — GET /clinical/cases
- `apps/admin/app/(dashboard)/_components/Sidebar.tsx` — เพิ่ม nav item สำหรับ supervisor

---

### 2. Referral Tickets (Advisor → Counselor)

**คืออะไร:**
อาจารย์ที่ปรึกษาส่งต่อนักศึกษาไปยังนักจิตวิทยาอย่างเป็นทางการ โดยไม่เห็น clinical data

**สิ่งที่ต้องทำ:**
- Migration: สร้างตาราง `advisory.referrals`
- API: `POST /advisory/referrals`, `GET /advisory/referrals`, `PATCH /advisory/referrals/:id`
- Admin UI: หน้าสร้าง referral ฝั่ง advisor + หน้าดู referral queue ฝั่ง counselor
- Schema: reason_category, urgency, note (non-clinical), consent

**DB Schema (ออกแบบไว้ใน CLAUDE.md):**
```sql
advisory.referrals:
  id uuid pk
  student_id → public.students
  from_advisor_id → advisory.advisors
  priority (low/normal/high)
  reason_category text
  note text  -- non-clinical เท่านั้น
  status (open/accepted/closed)
  created_at
```

---

### 3. Waitlist / No-Show Prevention

**คืออะไร:**
ป้องกันนักศึกษา no-show และจัดการ waitlist สำหรับ slot ยอดนิยม

**สิ่งที่ต้องทำ:**
- Waitlist table สำหรับ slot ที่เต็มแล้ว
- Job type `follow_up_noshow` (enum มีอยู่แล้วใน shared/enums แต่ยังไม่ implement)
- แจ้ง waitlist เมื่อมี slot ว่าง (cancellation flow)

---

## ลำดับความสำคัญที่แนะนำ

| ลำดับ | Feature | ความยาก | ผลกระทบ |
|-------|---------|---------|---------|
| 1 | Referral Tickets | ยาก (full feature) | Workflow ครบ |
| 2 | Supervisor Dashboard | กลาง (UI เท่านั้น) | Crisis response |
| 3 | Waitlist / No-show | ยาก | Phase 2 |

---

## Completed ✅

- **?next=booking param** — ปุ่มนัดหมายแสดงทุก risk level
- **Intent field → DB** — `clinical.screenings.intent` บันทึกค่า unsure/academic/stress/...
- **Dashboard URL env var** — `ADMIN_URL` ใน config.ts / worker.ts
