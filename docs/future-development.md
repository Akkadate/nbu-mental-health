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

## Small Improvements (ยังไม่ครบ)

### 4. ?next=booking Parameter ใน LIFF Screening

**คืออะไร:**
เมื่อ Soft Gate ส่งนักศึกษามาประเมินก่อนนัด จะเปิด LIFF ด้วย URL `?next=booking`
หลังประเมินเสร็จ ควรแสดงปุ่ม "นัดหมาย" เสมอ ไม่ว่าจะได้ risk ระดับไหน

**สถานะปัจจุบัน:**
- ปุ่ม "นัดหมาย" แสดงเฉพาะ risk moderate/high/crisis เท่านั้น
- ถ้าได้ LOW risk และมี `?next=booking` จะไม่มีปุ่มนัดหมายให้กด

**ไฟล์ที่ต้องแก้:**
- `apps/liff/app/screening/_components/ScreeningWizard.tsx`
- อ่าน `useSearchParams()` หาค่า `next`
- ถ้า `next === 'booking'` → แสดงปุ่ม "📅 นัดหมาย" เสมอ (ทุก risk level)

**โค้ดที่ต้องแก้ (ประมาณ 10 บรรทัด):**
```tsx
// ใน ScreeningWizard.tsx หรือ page.tsx
import { useSearchParams } from 'next/navigation'
const searchParams = useSearchParams()
const nextParam = searchParams.get('next') // 'booking' | null

// ใน result section:
{(risk !== 'low' || nextParam === 'booking') && (
    <a href="/booking?type=counselor" className="btn-line">
        📅 นัดพบนักจิตวิทยา
    </a>
)}
```

---

### 5. Intent Field ไม่ถูกเก็บลง DB

**คืออะไร:**
Field `intent` (เหตุผลที่ประเมิน: academic/stress/relationship/sleep/other/unsure) ถูกรับมาใน API
แต่ไม่ได้ save ลงตาราง `clinical.screenings`

**ผลกระทบ:**
- ข้อมูลสูญหาย ใช้วิเคราะห์ย้อนหลังไม่ได้
- ใช้แค่สร้าง routing suggestion แล้วทิ้ง

**ไฟล์ที่ต้องแก้:**
- Migration: `ALTER TABLE clinical.screenings ADD COLUMN intent text`
- `apps/api/src/routes/screenings.ts` — เพิ่ม `intent` ใน INSERT
- `apps/api/src/routes/clinical.ts` — เพิ่ม `intent` ใน SELECT

---

### 6. Dashboard URL Hardcode ใน Worker

**คืออะไร:**
URL ของ Admin dashboard ถูก hardcode ใน worker เป็น `https://mentalhealth.northbkk.ac.th`

**ไฟล์:**
- `apps/api/src/worker.ts` (บรรทัดที่สร้าง LINE notification message)

**วิธีแก้:**
```ts
// .env
ADMIN_URL=https://admin.mentalhealth.northbkk.ac.th

// config.ts
adminUrl: process.env.ADMIN_URL || 'https://admin.mentalhealth.northbkk.ac.th'

// worker.ts
const dashboardLink = `${config.adminUrl}/counselor/cases/${caseId}`
```

---

## ลำดับความสำคัญที่แนะนำ

| ลำดับ | Feature | ความยาก | ผลกระทบ |
|-------|---------|---------|---------|
| 1 | ?next=booking param | ง่าย (~10 บรรทัด) | UX ดีขึ้น |
| 2 | Dashboard URL env var | ง่าย (~5 บรรทัด) | Code quality |
| 3 | Intent field เก็บ DB | กลาง (migration + code) | Analytics |
| 4 | Referral Tickets | ยาก (full feature) | Workflow ครบ |
| 5 | Supervisor Dashboard | กลาง (UI เท่านั้น) | Crisis response |
| 6 | Waitlist / No-show | ยาก | Phase 2 |
