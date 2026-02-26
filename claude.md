# claude.md — Student Mental Health Early Warning Platform (LINE OA-first)
**Target**: เอกสารสำหรับให้ Claude Code / AI Coding สร้างระบบจริง (Next.js + Node.js + PostgreSQL) บน Ubuntu + Nginx  
**Scope**: สร้างใหม่ทั้งหมด (Greenfield)  
**Primary Channel**: LINE Official Account (LINE OA) + Web Admin (Next.js)

---

## 0) Product Summary (What we are building)
แพลตฟอร์มดูแลนักศึกษาแบบ “Front Door เดียว” ผ่าน LINE OA ที่รองรับ:
1) **Screening** (แบบประเมินความเครียด/PHQ-9/GAD-7 แบบสั้นหรือเต็ม)
2) **Routing** (แนะนำ/ส่งต่อไปพบ “อาจารย์ที่ปรึกษา” หรือ “นักจิตวิทยา” ด้วยกฎที่ปลอดภัย)
3) **Booking** (นัดหมาย Advisor/Counselor)
4) **Case Management (Counselor Only)** (สร้างเคส, ติดตามสถานะ, note แบบเข้ารหัส)
5) **Self-help Resource Hub** (ลิงก์/บทความ/แบบฝึกหัด)
6) **Aggregate Analytics** (แดชบอร์ดแบบไม่ระบุตัวบุคคล)

**Key Design Principle**
- One Platform UX (นักศึกษาเข้าที่เดียวผ่าน LINE)
- แต่แยก Domain & Access: `advisory` vs `clinical` vs `analytics`
- อาจารย์ที่ปรึกษา **ห้ามเห็น** คะแนน/แบบประเมินสุขภาพจิต (PHQ/GAD) และ clinical notes

---

## 1) Tech Stack
### Infrastructure
- Ubuntu (single VM acceptable for 5,000 students)
- Nginx reverse proxy (HTTPS)
- Node.js backend (recommended: NestJS หรือ Express + zod)
- PostgreSQL 15+
- Optional (Phase 2): Redis (queue), but Phase 1 ใช้ DB-backed jobs ได้

### Frontend
- Next.js (Admin/Staff portal)
- Tailwind CSS
- Auth: JWT + session cookie for web; LINE for student

### LINE Integration
- LINE Messaging API (Webhook) — ใช้สำหรับทั้ง student interaction และ push notification ถึง staff
- LIFF (LINE Front-end Framework) — **Required** สำหรับ Verify, Screening, Booking (ดูรายละเอียดใน `line_flows.md`)
- Store LINE userId mapping to student_id after LIFF-based verification
- ⚠️ LINE Notify เลิกให้บริการแล้ว — ใช้ LINE Messaging API push message แทนทั้งหมด

---

## 2) User Roles & Access Control (RBAC)
Roles:
- `student`
- `advisor`
- `counselor`
- `admin` (system admin; NO clinical data access)
- `supervisor` (optional; for crisis escalation; still clinical-only)

**Hard Rules**
- `advisor` can see: advisory appointments, student basic profile (non-clinical), referral tickets status
- `counselor` can see: screenings, cases, clinical notes, counselor appointments
- `admin` can see: system config, aggregate analytics, user management; cannot read clinical note/screenings raw
- `student` can see only their own: appointments, their own screening result level (not necessarily raw questionnaire)

---

## 3) Core Flows (LINE OA-first)

### 3.1 Student Onboarding: Link Student ID ↔ LINE userId
**Goal**: ก่อนใช้งาน ต้องผูก LINE กับรหัสนักศึกษา
**ดูรายละเอียด Flow ใน**: `line_flows.md` Section 2

Flow:
1) Student adds LINE OA → Follow Event → ผูก Rich Menu "Guest"
2) Student กดปุ่ม "🔐 ยืนยันตัวตน" → เปิด **LIFF Verify App**
3) LIFF form กรอก:
   - รหัสนักศึกษา
   - วันเกิด (verify_token)
   - เลือกเอกสารยืนยัน: **บัตรประชาชน/บัตรชมพู (นศ. ไทย)** หรือ **Passport (นศ. ต่างชาติ)**
   - กรอกเลขเอกสาร (verify_doc_number)
   - ☑ ยินยอม consent
4) LIFF → `POST /students/link-line` (ส่ง student_code, verify_doc_type, verify_token, verify_doc_number, line_user_id)
5) Backend verifies against student registry (Phase 1: import CSV → `public.students`)
6) If verified: store mapping `line_user_id -> student_id` + consent timestamp → สลับ Rich Menu เป็น "Verified"

Security:
- Rate limit: 5 attempts / 15 min per line_user_id
- Log verification attempts to `audit_log` (ไม่ log เลขบัตร/passport)
- DOB + เลขบัตร/passport → hash (SHA-256 + salt) ก่อนเก็บ/เทียบ (ไม่เก็บ plain text)
- Error response ไม่ระบุว่าข้อมูลใดผิด (ป้องกัน enumeration attack)
- ข้อมูลยืนยันตัวตนกรอกผ่าน LIFF เท่านั้น (ไม่เก็บใน LINE chat log)

### 3.2 Screening → Risk Evaluation → Routing Suggestion
Entry:
- Student types "ประเมินความเครียด" OR clicks rich menu

Steps:
1) bot shows consent + privacy summary
2) choose screening type:
   - quick stress mini (3–5 Q)
   - PHQ-9 + GAD-7 (full)
3) submit answers
4) backend calculates scores + risk_level (rule-based)
5) response:
   - show risk level + recommended next action
   - always keep student choice (soft recommendation)
   - if high/crisis: show Safety Pack + counselor booking CTA

### 3.3 Booking Advisor / Counselor
**ดูรายละเอียด Flow ใน**: `line_flows.md` Section 3.5 + Section 4

Entry:
- From routing suggestion buttons (ผลประเมิน CTA)
- From Rich Menu "📅 นัดหมาย" → **Soft Gate** (แนะนำประเมินก่อน แต่ไม่บังคับ)

**Soft Gate Logic**:
- ตรวจว่ามีผลประเมินล่าสุดภายใน 30 วันหรือไม่
- ถ้ามี → เปิด LIFF Booking ทันที
- ถ้าไม่มี → แสดง Flex Message "แนะนำประเมินก่อนนัด"
  - ปุ่มเด่น: [🧠 ประเมินก่อนนัด (แนะนำ)] — Primary CTA
  - ปุ่มรอง: [📅 ข้ามไปนัดหมายเลย] — Secondary link
- **Design Rationale**: Low-Barrier Access สำคัญกว่าข้อมูลครบ — นักจิตวิทยาทำ intake assessment ในห้องได้

Steps (LIFF Booking App):
1) choose type: advisor / counselor
2) choose mode: online/onsite
3) show slots (Phase 1: slot table managed by staff)
4) confirm → create appointment
5) LIFF close → Bot push ยืนยันนัดหมาย
6) send reminders via DB jobs (1 วันก่อน, 2 ชม.ก่อน)

### 3.4 Referral Ticket (Advisor → Counselor) (Phase 1 optional)
Advisor can create referral without seeing clinical scores:
- reason category, urgency, note (non-clinical), consent check
- counselor sees referral in queue

### 3.5 Counselor Case Management
When screening risk >= HIGH:
- create `clinical.case` automatically (priority HIGH/CRISIS)
- counselor dashboard shows queue
- counselor can: ACK, set status, add encrypted note, schedule follow-up

---

## 4) Risk Model (Rule-based v1)
We keep it simple, configurable, and auditable.

### 4.1 Scoring
- PHQ-9 total score: 0–27
- GAD-7 total score: 0–21
- Stress Mini: define scale 0–12 (example)

### 4.2 Risk Level Mapping (initial)
- `CRISIS`: PHQ-9 >= 20 OR self-harm item flagged (PHQ-9 item 9 >= 2)
- `HIGH`: PHQ-9 15–19 OR GAD-7 >= 15
- `MODERATE`: PHQ-9 10–14 OR GAD-7 10–14
- `LOW`: else

**Important**
- Crisis flow must show emergency contact + encourage immediate help.
- Do not send raw scores via LINE notification to staff; use case_id + priority.

### 4.3 Routing Rules
Inputs: `risk_level`, `intent` (student topic), `availability`

- LOW:
  - show self-help resources + optional booking
- MODERATE:
  - if intent == academic → suggest advisor-first, allow counselor option
  - else → suggest counselor-first, allow advisor option
- HIGH:
  - create case (priority HIGH), suggest counselor booking
- CRISIS:
  - create case (priority CRISIS), start escalation workflow, show safety pack

---

## 5) Database Design (PostgreSQL)
Use schemas to separate domains:
- `public` (shared)
- `advisory`
- `clinical`
- `analytics`

### 5.1 public schema
**public.users**
- id (uuid pk)
- role (enum)
- email (nullable; for staff)
- created_at

**public.students**
- id (uuid pk)
- student_code (unique)  // รหัสนักศึกษา
- faculty, year
- status (active/inactive)
- created_at

**public.line_links**
- id (uuid pk)
- student_id (fk public.students.id)
- line_user_id (unique)
- linked_at
- consent_version
- consented_at

**public.audit_log**
- id, actor_user_id, actor_role
- action (string)
- object_type, object_id
- ip, user_agent
- created_at

### 5.2 advisory schema
**advisory.advisors**
- id (uuid pk)
- user_id (fk public.users)
- name, faculty

**advisory.appointments**
- id (uuid pk)
- student_id (fk public.students)
- advisor_id (fk advisory.advisors)
- scheduled_at (timestamptz)
- mode (online/onsite)
- status (scheduled/completed/cancelled/no_show)
- created_at

**advisory.slots**
- id, advisor_id
- start_at, end_at
- is_available (bool)

**advisory.referrals** (optional)
- id, student_id
- from_advisor_id
- priority (low/normal/high)
- reason_category
- note (non-clinical)
- status (open/accepted/closed)
- created_at

### 5.3 clinical schema
**clinical.screenings**
- id (uuid pk)
- student_id
- type (stress_mini/phq9_gad7)
- answers_json (jsonb)  // consider encrypt-at-app for full answers
- phq9_score, gad7_score, stress_score
- risk_level (low/moderate/high/crisis)
- created_at

**clinical.cases**
- id (uuid pk)
- student_id
- latest_screening_id (nullable)
- priority (high/crisis)
- status (open/acked/contacted/follow_up/closed)
- assigned_counselor_id (nullable)
- acked_at, closed_at
- created_at

**clinical.counselors**
- id (uuid pk)
- user_id (fk public.users)
- name

**clinical.appointments**
- id
- student_id
- counselor_id
- scheduled_at
- mode
- status
- created_at

**clinical.case_notes** (encrypted)
- id
- case_id
- counselor_id
- encrypted_note (text)
- created_at

**clinical.slots**
- id, counselor_id
- start_at, end_at
- is_available

### 5.4 analytics schema (aggregate only)
**analytics.daily_metrics**
- metric_date (date)
- faculty
- risk_low_count, risk_mod_count, risk_high_count, risk_crisis_count
- advisor_appt_count, counselor_appt_count
- created_at

### 5.5 jobs (DB-backed queue for Phase 1)
**public.jobs**
- id (uuid pk)
- type (string) // send_line_message, reminder, escalation_check, aggregate_rollup
- payload (jsonb)
- run_at (timestamptz)
- status (pending/running/success/failed)
- retry_count
- last_error
- created_at

Indexes:
- jobs(status, run_at)
- screenings(student_id, created_at desc)
- appointments(type?, scheduled_at, status)

---

## 6) API Design (Backend)
Backend exposes:
1) LINE Webhook endpoints
2) Staff web portal APIs (JWT auth)

### 6.1 LINE Webhook
`POST /webhooks/line`
- verify signature
- parse events (message, postback)
- route to handlers

### 6.2 Student Functions (invoked via LINE + LIFF)
These are REST endpoints called by LIFF apps + webhook handlers:

**LIFF Verify** → `POST /students/link-line` (student_code, verify_doc_type, verify_token, verify_doc_number, line_user_id)
**LIFF Screening** → `POST /screenings` (student_id, type, intent, answers)
**LIFF Booking** → `GET /advisory/slots` or `GET /clinical/slots` → `POST /appointments`

**Webhook Postback Handlers** (internal):
- `booking_gate` → ตรวจ screening ล่าสุด → Soft Gate หรือเปิด LIFF
- `resources` → Flex Carousel แหล่งช่วยเหลือ
- `my_appointments` → Flex Message รายการนัดหมาย
- `cancel_appt` → ยืนยัน + ยกเลิก
- `safety_pack` → เบอร์ฉุกเฉิน + แบบฝึกลดเครียด
- `emergency_info` → เบอร์ฉุกเฉินทั้งหมด

### 6.3 Staff Web Portal APIs
Auth:
- `POST /auth/login` (email/pass or SSO integration later)
- `GET /me`

Advisor:
- `GET /advisory/appointments?from=&to=`
- `POST /advisory/slots`
- `PATCH /advisory/appointments/:id`

Counselor:
- `GET /clinical/cases?status=open`
- `POST /clinical/cases/:id/ack`
- `POST /clinical/case-notes` (encrypt server-side)
- `GET /clinical/appointments`
- `POST /clinical/slots`

Admin (aggregate only):
- `GET /analytics/overview?from=&to=`
- `GET /analytics/faculty-heatmap?date=`

---

## 7) Security & Privacy Requirements (Must Implement)
- HTTPS only (Nginx TLS)
- Secrets via environment variables (no hardcode)
- Strict RBAC middleware on every staff endpoint
- Audit log: whenever a counselor views a case, reads screening, writes note, exports aggregate
- Encrypt clinical notes:
  - Use AES-256-GCM
  - Key stored in env/secret manager
  - Store IV + ciphertext in `encrypted_note`
- Never expose raw screening answers to advisor/admin
- Staff notification ผ่าน **LINE Messaging API push message** (LINE Notify เลิกให้บริการแล้ว)
- LINE messages to staff should contain only: case_id, priority, link to dashboard (requires auth)

---

## 8) Sequence Diagram Specs (implement exactly)
### 8.1 Screening → Routing (Normal)
1) student submits answers via **LIFF Screening App** → `POST /screenings`
2) backend validates student linked (line_user_id → student_id)
3) compute scores + risk
4) insert `clinical.screenings`
5) if risk >= HIGH then create `clinical.cases`
6) LIFF closes → Bot **push Flex Message** back: result + CTA booking/self-help
7) write aggregate metric job (do not store student_id in analytics)
8) if LIFF opened with `?next=booking`, include booking CTA in result message

### 8.2 High/Crisis (with escalation)
- create case
- create jobs:
  - notify_counselor_queue immediately → **LINE Messaging API push** (case_id + priority + dashboard link)
  - escalation_check run_at = now + 30 min (for crisis) → push escalation alert
  - reminder to student for booking follow-up

---

## 9) LINE UX Requirements
**ดูรายละเอียดเต็มใน**: `line_flows.md` (postback schemas, Flex Message JSON, LIFF UI mockups)

### 9.1 Rich Menu (2 ชุด — สลับตามสถานะ)

**Rich Menu "Guest"** (ยังไม่ยืนยันตัวตน):
- 🔐 ยืนยันตัวตน → LIFF Verify URL
- 📞 ฉุกเฉิน → tel:1323

**Rich Menu "Verified"** (ยืนยันตัวตนแล้ว):
- 🧠 ประเมินตนเอง → LIFF Screening URL
- 📅 นัดหมาย → postback `action=booking_gate` (Soft Gate)
- 📚 แหล่งช่วยเหลือ → postback `action=resources`
- 📞 ฉุกเฉิน → tel:1323

**Switching**: Follow Event → ตรวจ line_user_id ใน DB → ผูก Guest หรือ Verified  
Link สำเร็จ → `linkRichMenuToUser(userId, VERIFIED_MENU_ID)` ทันที

### 9.2 Message Templates
- Welcome message (new user — ยังไม่ยืนยัน)
- Welcome back (user ที่ linked แล้ว)
- Consent prompt (ก่อนทำแบบประเมิน พร้อม privacy summary)
- Screening result (4 ระดับ: LOW 🌿 / MODERATE 💛 / HIGH 🧡 / CRISIS ❤️)
- Booking confirmation + reminders
- Safety pack (crisis/emergency — เบอร์ฉุกเฉิน + แบบฝึกผ่อนคลาย)
- Soft Gate (แนะนำประเมินก่อนนัด)
- Staff notifications (case_id + priority + dashboard link เท่านั้น)

### 9.3 LIFF Apps (Required — 3 apps)

| LIFF App | หน้าที่ | เรียก API |
|----------|---------|----------|
| **Verify** | ยืนยันตัวตน (รหัส นศ. + วันเกิด + บัตร ปชช./Passport) | `POST /students/link-line` |
| **Screening** | ทำแบบประเมิน PHQ-9/GAD-7/Stress Mini | `POST /screenings` |
| **Booking** | จองนัดหมาย (เลือก type, mode, slot) | `GET /*/slots` → `POST /appointments` |

LIFF apps อาจเป็น Single SPA (Next.js/React) ที่ route ภายใน หรือแยก 3 LIFF IDs ก็ได้

### 9.4 Staff Notifications (LINE Messaging API)
- ⚠️ **LINE Notify เลิกให้บริการแล้ว** — ใช้ LINE Messaging API push message แทน
- Staff (counselor/supervisor) ต้องเพิ่มเพื่อน LINE OA เพื่อรับ notification
- ส่งเฉพาะ: case_id + priority + link ไปยัง dashboard (ต้อง login เพื่อดูรายละเอียด)
- ห้ามส่ง raw score, ชื่อนักศึกษา, หรือข้อมูล clinical ผ่าน LINE

---

## 10) Deployment Plan (Ubuntu + Nginx)
### 10.1 Processes
- Node backend: systemd service (or pm2)
- Next.js frontend: build + run (or export static for admin if possible)
- Postgres: managed or local (prefer managed if available; if local, ensure backups)

### 10.2 Nginx
- `api.domain` → backend (proxy_pass)
- `admin.domain` → nextjs
- Enforce:
  - `client_max_body_size`
  - timeouts
  - HSTS
  - gzip

### 10.3 Backups
- daily pg_dump to storage
- retention 14–30 days
- restore drill monthly

---

## 11) Non-Functional Requirements (NFR)
- Availability: 99%
- p95 API latency: < 300ms (excluding LINE network)
- Concurrency: peak 200–500 active (ช่วงก่อนสอบ)
- Data retention:
  - clinical screenings: 2 years (configurable)
  - clinical notes: 5 years (configurable)
  - analytics aggregate: 7 years

---

## 12) Implementation Phases (recommended)
### Phase 1 (MVP production)
- Student LINE linking
- Screening (stress mini + full)
- Risk engine (rule-based)
- Booking (advisor + counselor, slots managed by staff)
- Counselor case queue + encrypted notes
- Self-help hub
- Aggregate metrics (daily rollup job)
- Admin/Staff portal basic

### Phase 2
- DB jobs → Redis queue (optional)
- Escalation workflow state machine fully automated
- No-show prevention (reminders + waitlist)
- Referral tickets advisor→counselor

---

## 13) Definition of Done (DoD)
- All endpoints have RBAC tests
- Clinical note encryption verified
- Advisor cannot access clinical tables by API
- Audit log entries created on sensitive actions
- LINE webhook verified signature
- Retry strategy for LINE message failures via jobs
- Backup & restore tested
- Load test for screening burst (>= 500 submissions within 10 minutes)

---

## 14) Coding Instructions for Claude Code (How to generate)
Generate repository with:
- `/apps/admin` (Next.js + Tailwind — Staff web portal)
- `/apps/api` (Node.js backend — REST API + LINE Webhook)
- `/apps/liff` (LIFF app — Verify + Screening + Booking, React/Next.js SPA)
- `/packages/shared` (types, zod schemas, enums)
- `/infra/nginx` (sample config)
- `/infra/sql` (migrations)

Backend guidelines:
- Use migration tool (Prisma Migrate / Knex / Drizzle)
- Use zod validation for all inputs
- Use structured logging (pino/winston)
- Use env validation at startup
- Use a dedicated module for LINE signature verification + event routing
- Implement DB-backed jobs worker as separate process: `node worker.js`
- LINE Messaging API push message สำหรับ notification (LINE Notify deprecated)

LIFF App guidelines:
- Single SPA with internal routing: `/verify`, `/screening`, `/booking`
- Use `@line/liff` SDK for profile access and auth
- Responsive mobile-first design (LIFF runs in LINE app browser)
- Call backend API with LIFF access token for auth

Frontend (Admin) guidelines:
- Role-based pages: advisor, counselor, admin
- Minimal UI: appointments calendar list, case queue list, analytics cards
- Tailwind components, no heavy UI library necessary

---

## 15) Open Questions (assumptions to hardcode for now)
- Student registry source: start with `public.students` import CSV
- Staff auth: local email/pass for MVP (upgrade to SSO later)
- Appointment slots: staff-managed table (not Google Calendar integration)

---

## 16) Acceptance Scenarios (must pass)
1) Student links LINE successfully → can access menu
2) Student completes screening → receives correct routing suggestion
3) Risk HIGH → case created, counselor sees it, advisor does not
4) Counselor writes note → stored encrypted
5) Admin sees only aggregate analytics, no student identifiers
6) LINE webhook replay → idempotency prevents duplicate appointments/screenings
7) Reminder job sends message even if API request already returned

---

**End of claude.md**