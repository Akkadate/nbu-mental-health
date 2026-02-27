# LINE Configuration — NBU Mental Health Platform

เอกสารอ้างอิงการตั้งค่า LINE ทั้งหมดของระบบ
**อัปเดต**: 2026-02-27

---

## 1. LINE Official Account (LINE OA)

| รายการ | ค่า |
|--------|-----|
| ชื่อ OA | NBU Mental Health |
| สร้างที่ | [LINE Official Account Manager](https://manager.line.biz/) |
| ใช้งาน | นักศึกษา Add เพื่อนผ่าน OA นี้ |

---

## 2. LINE Developers Console

URL: [developers.line.biz](https://developers.line.biz/)
**Provider** → **Channel: Messaging API** (เชื่อมกับ OA ด้านบน)

### 2.1 Messaging API Channel Settings

| รายการ | ที่ตั้งใน Console | ใช้ใน `.env` |
|--------|------------------|--------------|
| Channel Secret | Basic settings → Channel secret | `LINE_CHANNEL_SECRET` |
| Channel Access Token | Messaging API → Issue token (Long-lived) | `LINE_CHANNEL_ACCESS_TOKEN` |

### 2.2 Webhook URL

```
https://api.nbu-mh.example.com/webhooks/line
```

ตั้งใน: Messaging API → Webhook settings
- ✅ Use webhook: **ON**
- ✅ เปิดหน้า Verify แล้วกด "Verify" เพื่อทดสอบ

> ⚠️ URL นี้ต้องเป็น HTTPS จริง (ไม่รองรับ HTTP หรือ localhost)

### 2.3 Auto-reply / Greeting message

ตั้งใน LINE Official Account Manager → Response settings:
- ✅ Webhooks: **Enabled**
- ❌ Auto-response messages: **Disabled** (ระบบจัดการเองผ่าน webhook)
- ❌ Greeting messages: **Disabled** (ระบบส่ง welcome message เองเมื่อ Follow)

---

## 3. LIFF Apps (4 Apps)

สร้างใน: LINE Developers → Channel (Messaging API) → LIFF tab

### 3.1 LIFF: Verify (ยืนยันตัวตน)

| รายการ | ค่า |
|--------|-----|
| LIFF app name | NBU Verify |
| Size | **Full** |
| Endpoint URL | `https://liff.nbu-mh.example.com/verify` |
| Scope | profile, openid |
| Bot link feature | **On (Aggressive)** |
| LIFF ID ที่ได้ | ใส่ใน `LIFF_VERIFY_ID` |

### 3.2 LIFF: Screening (แบบประเมิน)

| รายการ | ค่า |
|--------|-----|
| LIFF app name | NBU Screening |
| Size | **Full** |
| Endpoint URL | `https://liff.nbu-mh.example.com/screening` |
| Scope | profile, openid |
| Bot link feature | **On (Aggressive)** |
| LIFF ID ที่ได้ | ใส่ใน `LIFF_SCREENING_ID` |

### 3.3 LIFF: Booking (นัดหมาย)

| รายการ | ค่า |
|--------|-----|
| LIFF app name | NBU Booking |
| Size | **Full** |
| Endpoint URL | `https://liff.nbu-mh.example.com/booking` |
| Scope | profile, openid |
| Bot link feature | **On (Aggressive)** |
| LIFF ID ที่ได้ | ใส่ใน `LIFF_BOOKING_ID` |

### 3.4 LIFF: Link Staff (เชื่อม LINE สำหรับเจ้าหน้าที่)

| รายการ | ค่า |
|--------|-----|
| LIFF app name | NBU Staff Link |
| Size | **Compact** |
| Endpoint URL | `https://liff.nbu-mh.example.com/link-staff` |
| Scope | profile, openid |
| Bot link feature | **On** |
| LIFF ID ที่ได้ | ใส่ใน `LIFF_LINK_STAFF_ID` |

> เจ้าหน้าที่พิมพ์ `/myid` หรือ `/linkstaff` ใน chat เพื่อรับลิงก์เชื่อม LINE

---

## 4. Rich Menu

สร้างผ่าน LINE Messaging API (ไม่มีใน Console UI) หรือใช้ [LINE Bot Designer](https://developers.line.biz/en/services/bot-designer/)

> **วิธีสร้างด้วย API**: ดู Section 4.3

### 4.1 Rich Menu ชุด "Guest" (ยังไม่ยืนยันตัวตน)

**ขนาด**: 2500 × 843 px (half keyboard)
**ปุ่ม**: 2 ปุ่ม

| ปุ่ม | ตำแหน่ง | Action type | ค่า |
|------|---------|-------------|-----|
| 🔐 ยืนยันตัวตน | ซ้าย (ใหญ่) | URI | `https://liff.line.me/{LIFF_VERIFY_ID}` |
| 📞 ฉุกเฉิน | ขวา | URI | `tel:1323` |

**Area JSON (ตัวอย่าง 2500×843)**:
```json
{
  "size": { "width": 2500, "height": 843 },
  "selected": true,
  "name": "Guest Menu",
  "chatBarText": "เมนู",
  "areas": [
    {
      "bounds": { "x": 0, "y": 0, "width": 1875, "height": 843 },
      "action": { "type": "uri", "label": "ยืนยันตัวตน", "uri": "https://liff.line.me/LIFF_VERIFY_ID" }
    },
    {
      "bounds": { "x": 1875, "y": 0, "width": 625, "height": 843 },
      "action": { "type": "uri", "label": "ฉุกเฉิน", "uri": "tel:1323" }
    }
  ]
}
```

ใส่ Rich Menu ID ที่ได้ใน `.env`: `RICH_MENU_GUEST_ID`

---

### 4.2 Rich Menu ชุด "Verified" (ยืนยันตัวตนแล้ว)

**ขนาด**: 2500 × 843 px (half keyboard)
**ปุ่ม**: 4 ปุ่ม (grid 2×2)

| ปุ่ม | Action type | ค่า |
|------|-------------|-----|
| 🧠 ประเมินตนเอง | URI | `https://liff.line.me/{LIFF_SCREENING_ID}` |
| 📅 นัดหมาย | Postback | `action=booking_gate` |
| 📚 แหล่งช่วยเหลือ | Postback | `action=resources` |
| 📞 ฉุกเฉิน | URI | `tel:1323` |

**Area JSON (ตัวอย่าง 2×2 grid)**:
```json
{
  "size": { "width": 2500, "height": 843 },
  "selected": true,
  "name": "Verified Menu",
  "chatBarText": "เมนู",
  "areas": [
    {
      "bounds": { "x": 0, "y": 0, "width": 1250, "height": 421 },
      "action": { "type": "uri", "label": "ประเมินตนเอง", "uri": "https://liff.line.me/LIFF_SCREENING_ID" }
    },
    {
      "bounds": { "x": 1250, "y": 0, "width": 1250, "height": 421 },
      "action": { "type": "postback", "label": "นัดหมาย", "data": "action=booking_gate" }
    },
    {
      "bounds": { "x": 0, "y": 421, "width": 1250, "height": 422 },
      "action": { "type": "postback", "label": "แหล่งช่วยเหลือ", "data": "action=resources" }
    },
    {
      "bounds": { "x": 1250, "y": 421, "width": 1250, "height": 422 },
      "action": { "type": "uri", "label": "ฉุกเฉิน", "uri": "tel:1323" }
    }
  ]
}
```

ใส่ Rich Menu ID ที่ได้ใน `.env`: `RICH_MENU_VERIFIED_ID`

---

### 4.3 วิธีสร้าง Rich Menu ด้วย cURL

**Step 1 — Upload รูปภาพ**
```bash
curl -X POST \
  https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -H "Content-Type: image/png" \
  --data-binary @guest-menu.png
```

**Step 2 — สร้าง Rich Menu**
```bash
curl -X POST \
  https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{  ...area JSON ด้านบน...  }'
```

Response: `{"richMenuId": "richmenu-xxxxxxxxxxxx"}`
→ คัดลอก richMenuId ไปใส่ใน `.env`

**Step 3 — ตั้งเป็น Default Menu (สำหรับ Guest)**
```bash
curl -X POST \
  https://api.line.me/v2/bot/user/all/richmenu/{richMenuId} \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}"
```

> Rich Menu "Verified" ไม่ต้องตั้ง default — ระบบจะผูกให้อัตโนมัติเมื่อนักศึกษา link สำเร็จ

---

### 4.4 Rich Menu Switching (ระบบจัดการอัตโนมัติ)

```
Follow Event → ตรวจ line_user_id ใน DB
  ├─ ไม่พบ (ยังไม่ link) → assignGuestMenu()   → RICH_MENU_GUEST_ID
  └─ พบแล้ว (link แล้ว)  → assignVerifiedMenu() → RICH_MENU_VERIFIED_ID

Link สำเร็จ (POST /students/link-line) → assignVerifiedMenu() ทันที
```

---

## 5. Environment Variables (.env)

```env
# ── LINE ──────────────────────────────────────────────────
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── LIFF IDs ──────────────────────────────────────────────
# Format: xxxxxxxxxx-xxxxxxxx
LIFF_VERIFY_ID=
LIFF_SCREENING_ID=
LIFF_BOOKING_ID=
LIFF_LINK_STAFF_ID=

# ── Rich Menu IDs ──────────────────────────────────────────
# Format: richmenu-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RICH_MENU_GUEST_ID=
RICH_MENU_VERIFIED_ID=
```

---

## 6. Postback Actions (ค่าที่ระบบรู้จัก)

| data | ทำงานใน code | ผล |
|------|-------------|-----|
| `action=booking_gate` | `handleBookingGate()` | ตรวจ screening ล่าสุด 30 วัน → Soft Gate หรือเปิด Booking LIFF |
| `action=resources` | `handleResources()` | Flex Carousel แหล่งช่วยเหลือ |
| `action=resources&category=xxx` | `handleResources()` | กรองตาม category |
| `action=my_appointments` | `handleMyAppointments()` | รายการนัดหมายที่จะมาถึง |
| `action=cancel_appt&appt_id=xxx&appt_type=advisor` | `handleCancelAppt()` | ยกเลิกนัดหมาย |
| `action=emergency_info` | ส่ง Safety Pack | เบอร์ฉุกเฉิน + ลิงก์โทร |

---

## 7. Staff Notification Setup

เจ้าหน้าที่ (Counselor/Advisor) ต้องทำสิ่งต่อไปนี้เพื่อรับ notification:
1. **Add เพื่อน** LINE OA ของระบบ
2. พิมพ์ `/myid` เพื่อรับ LINE User ID ของตนเอง
3. แจ้ง admin นำ LINE User ID ไปใส่ในระบบ (Admin Panel → จัดการเจ้าหน้าที่)

> ⚠️ ไม่ใช้ LINE Notify (เลิกให้บริการแล้ว) — ระบบใช้ Messaging API push message ทั้งหมด

---

## 8. Checklist การตั้งค่าครั้งแรก

- [ ] สร้าง LINE OA
- [ ] สร้าง Messaging API Channel เชื่อมกับ OA
- [ ] คัดลอก Channel Secret + Access Token ใส่ `.env`
- [ ] ตั้ง Webhook URL + เปิด Use webhook
- [ ] ปิด Auto-reply + Greeting message
- [ ] สร้าง LIFF 4 apps → คัดลอก LIFF IDs ใส่ `.env`
- [ ] ออกแบบรูป Rich Menu 2 ชุด (Guest + Verified) ขนาด 2500×843 px
- [ ] Upload รูป + สร้าง Rich Menu ผ่าน API → คัดลอก Menu IDs ใส่ `.env`
- [ ] ตั้ง Rich Menu "Guest" เป็น Default
- [ ] Build + restart API: `pm2 restart nbu-api`
- [ ] ทดสอบ Follow → ได้ Welcome message + Guest menu
- [ ] ทดสอบ Verify → ยืนยันสำเร็จ → สลับเป็น Verified menu
