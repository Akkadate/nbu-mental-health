# openapi.md — Student Mental Health Early Warning Platform (Complete API Spec)
**System**: Student Mental Health Early Warning Platform (LINE OA-first)  
**Backend**: Node.js (NestJS/Express)  
**DB**: PostgreSQL  
**Primary Channel**: LINE Official Account  
**Admin Portal**: Next.js (JWT auth)

---

# 0) Global Conventions

## Base URL
https://api.yourdomain.com

## Authentication

### 1) Staff (Advisor / Counselor / Admin / Supervisor)
Header:

Authorization: Bearer <JWT>


### 2) Student (via LINE)
- LINE webhook verifies `x-line-signature`
- Student identified by `line_user_id` → mapped to `student_id`
- No public student JWT in Phase 1

---

## Standard Response Envelope

### Success
```json
{
  "data": { ... }
}
Error
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
Enums
Role

student

advisor

counselor

admin

supervisor

RiskLevel

low

moderate

high

crisis

AppointmentStatus

scheduled

completed

cancelled

no_show

CaseStatus

open

acked

contacted

follow_up

closed

Priority

high

crisis

Mode

online

onsite

1) Health
GET /health

Response 200

{
  "data": {
    "status": "ok",
    "timestamp": "2026-02-25T00:00:00Z"
  }
}
2) LINE Webhook
POST /webhooks/line

Headers:

x-line-signature: <string>

Body:
LINE official webhook payload

Behavior:

Verify signature

Deduplicate event (using eventId)

Route message/postback

Trigger internal services

Response:

{
  "data": {
    "handled": true
  }
}
3) Authentication (Staff Only)
POST /auth/login

Body:

{
  "email": "staff@university.ac.th",
  "password": "password"
}

Response:

{
  "data": {
    "access_token": "jwt_token",
    "user": {
      "id": "uuid",
      "role": "counselor"
    }
  }
}
GET /me

Headers:
Authorization: Bearer token

Response:

{
  "data": {
    "id": "uuid",
    "role": "admin",
    "email": "staff@..."
  }
}
4) Student LINE Linking
POST /students/link-line

Purpose:
Verify student_code and link to LINE userId

Body:

{
  "student_code": "6500001",
  "verify_token": "YYYY-MM-DD",
  "line_user_id": "Uxxxxxxxx"
}

Response:

{
  "data": {
    "linked": true,
    "student_id": "uuid"
  }
}

Errors:

STUDENT_NOT_FOUND

VERIFY_FAILED

ALREADY_LINKED

5) Screening
POST /screenings

Auth:
Student via LINE mapping

Body:

{
  "student_id": "uuid",
  "type": "phq9_gad7",
  "intent": "stress",
  "answers": {
    "phq9": [0,1,2,0,1,0,1,0,0],
    "gad7": [1,1,0,1,0,0,1]
  }
}

Response:

{
  "data": {
    "screening_id": "uuid",
    "scores": {
      "phq9": 6,
      "gad7": 4
    },
    "risk_level": "moderate",
    "routing_action": "suggest_counselor",
    "next_steps": [
      {
        "type": "cta",
        "label": "จองพบนักจิตวิทยา",
        "action": "book:counselor"
      }
    ]
  }
}
GET /screenings/my

(Student only)

Response:

{
  "data": {
    "items": [
      {
        "id": "uuid",
        "risk_level": "moderate",
        "created_at": "timestamp"
      }
    ]
  }
}
GET /clinical/screenings

(Counselor only)

Query params:

risk_level

from

to

Response:

{
  "data": {
    "items": [
      {
        "id": "uuid",
        "student_id": "uuid",
        "phq9_score": 6,
        "gad7_score": 4,
        "risk_level": "moderate"
      }
    ]
  }
}
6) Booking System
GET /advisory/slots

Response:

{
  "data": {
    "items": [
      {
        "id": "uuid",
        "start_at": "timestamp",
        "end_at": "timestamp",
        "is_available": true
      }
    ]
  }
}
GET /clinical/slots

Same structure as advisory

POST /appointments

Body:

{
  "student_id": "uuid",
  "type": "counselor",
  "slot_id": "uuid",
  "mode": "onsite"
}

Response:

{
  "data": {
    "appointment_id": "uuid",
    "scheduled_at": "timestamp",
    "status": "scheduled"
  }
}
GET /appointments/my

Response:

{
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "advisor",
        "scheduled_at": "timestamp",
        "status": "scheduled"
      }
    ]
  }
}
7) Case Management (Counselor)
GET /clinical/cases

Query:

status

priority

Response:

{
  "data": {
    "items": [
      {
        "id": "uuid",
        "student_id": "uuid",
        "priority": "high",
        "status": "open"
      }
    ]
  }
}
POST /clinical/cases/{id}/ack

Response:

{
  "data": {
    "acked": true
  }
}
PATCH /clinical/cases/{id}

Body:

{
  "status": "contacted"
}
POST /clinical/case-notes

Body:

{
  "case_id": "uuid",
  "note_plaintext": "session summary"
}

Response:

{
  "data": {
    "note_id": "uuid"
  }
}
8) Self Help Resources
GET /resources

Response:

{
  "data": {
    "items": [
      {
        "id": "uuid",
        "category": "stress",
        "title": "Breathing Exercise",
        "url": "https://...",
        "is_active": true
      }
    ]
  }
}
POST /admin/resources

(Admin only)

Body:

{
  "category": "stress",
  "title": "Mindfulness",
  "url": "https://...",
  "is_active": true
}
9) Analytics (Aggregate Only)
GET /analytics/overview

Response:

{
  "data": {
    "daily": [
      {
        "date": "2026-03-01",
        "risk_low": 10,
        "risk_moderate": 5,
        "risk_high": 1,
        "risk_crisis": 0
      }
    ]
  }
}
GET /analytics/faculty-heatmap

Response:

{
  "data": [
    {
      "faculty": "IT",
      "risk_high": 2
    }
  ]
}
10) Jobs (Admin Debug)
GET /admin/jobs
POST /admin/jobs/run-due
11) Error Codes

UNAUTHORIZED

FORBIDDEN

VALIDATION_ERROR

NOT_FOUND

SLOT_UNAVAILABLE

STUDENT_NOT_FOUND

VERIFY_FAILED

ALREADY_LINKED

CASE_NOT_ACCESSIBLE

INTERNAL_ERROR

12) Idempotency Rules

LINE eventId must be stored and checked

Booking must lock slot before insert

Screening submission must prevent duplicate within 30 seconds (optional)