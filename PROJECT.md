# Project: Ta''lim Markazi Security Audit, E2E Functional Testing & Remediation

## Architecture
- **Backend API**: NestJS 10 running on Port 4000 (http://localhost:4000/api), Prisma ORM with SQLite (prisma/dev.db), Jest 29.7 test suite with Supertest 7.0.
- **Frontend Admin Portal & Mini Apps**: Next.js 14.2.35 App Router on Port 3000 (http://localhost:3000), proxying /api/* to Port 4000.
  - Admin Portal (/): 9 operational sections (KPI/Funnel, Clients Table, Trials Calendar, Live Chat Takeover, Courses & Groups, Knowledge Base, Tasks, Attendance & Grades Journal, Audit Log).
  - Student Telegram Mini App (/student): Timetable, attendance percentage, per-lesson status, teacher grades, payments.
  - Teacher Telegram Mini App (/teacher): Group switching, 1-tap attendance marking, student grading, real-time sync.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Auth & RBAC Guarding | Protect all endpoints (Attendance, Grades, Enrollments, AI tool-call) with JwtAuthGuard & RolesGuard | M1 | Survey VULN-01..05 |
| 2 | IDOR & Authorization Defense | Prevent unauthorized cross-student and cross-group attendance/grades tampering | M1 | Survey VULN-02 |
| 3 | Input Validation & DTOs | Convert critical interfaces to validated DTO classes with class-validator decorators | M1 | Survey VULN-12 |
| 4 | Rate Limiting & Throttling | Throttle sensitive endpoints (/auth/login, /bookings, /ai/chat) to prevent brute-force and DoS | M2 | Survey VULN-11 |
| 5 | Group Capacity Concurrency | Atomic transaction check to strictly enforce group capacity limits | M2 | Survey VULN-14 |
| 6 | Frontend UI & Breadcrumbs | Fix missing attendance breadcrumb, resolve 401 token refresh loop, add error boundary & eslintrc | M3 | Survey UI bugs |
| 7 | Security Pentest Suite | Automated Supertest regression suite verifying 401 on unauthorized calls, IDOR rejection, and validation | T1 | ORIGINAL_REQUEST R1 |
| 8 | Browser E2E Test Suite | Automated browser verification for Admin Portal 9 sections and Telegram Mini Apps with instant sync | T2 | ORIGINAL_REQUEST R2 |
| 9 | Final E2E Pass & Adversarial Hardening | 100% pass of existing 87 backend tests + security pentests + clean frontend build + adversarial audit | M4 | ORIGINAL_REQUEST R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Auth, RBAC & IDOR Hardening | Guard Attendance, Grades, Enrollments, AI tools, sanitize student portal data, add class validation | None | IN_PROGRESS |
| M2 | Rate Limiting & Capacity Concurrency | Install/configure throttler and atomic group capacity validation in Prisma | M1 | PLANNED |
| M3 | Frontend & Telegram Mini Apps UI Patching | Fix breadcrumb title, token refresh loop, error boundary, and eslintrc | None | IN_PROGRESS |
| T1 | Security Pentesting Test Suite | Automated Jest/Supertest suite verifying all R1 security criteria | M1 | PLANNED |
| T2 | Browser E2E Functional Test Suite | Browser verification script for 9 sections, Student TMA, Teacher TMA & live sync | M3 | PLANNED |
| M4 | Final Verification, 100% Pass & Adversarial Hardening | Verify all 87 tests + security tests pass, build succeeds, adversarial and forensic audit pass | M1, M2, M3, T1, T2 | PLANNED |

## Interface Contracts
### Client ↔ Server Auth Contract
- Protected endpoints require: Authorization: Bearer <jwt_token>.
- Unauthorized requests MUST return HTTP 401 Unauthorized.
- Forbidden roles MUST return HTTP 403 Forbidden.

### Attendance & Grades API Contract
- POST /api/attendance: Requires TEACHER or ADMIN/SUPER_ADMIN role. Validates that enrollmentId belongs to groupId.
- POST /api/grades: Requires TEACHER or ADMIN/SUPER_ADMIN role. Validates that enrollmentId belongs to groupId.
- GET /api/enrollments/student/:identifier: Student self-service endpoint returns only that student''s own profile and masks/omits other records.

### Teacher TMA ↔ Admin Portal Sync Contract
- Teacher TMA submissions to POST /api/attendance and POST /api/grades immediately persist to Prisma DB.
- Admin Portal polls /api/attendance/group/:groupId and /api/grades/group/:groupId and updates UI within 5 seconds.

## Code Layout
- ackend/src/attendance/ — Attendance controller, service, module, DTOs
- ackend/src/grades/ — Grades controller, service, module, DTOs
- ackend/src/enrollments/ — Enrollments controller, service, module, DTOs
- ackend/src/auth/ — Auth controller, service, JWT strategy, guards, roles
- ackend/src/ai/ — AI controller, service, tools
- ackend/src/common/ — Guards, decorators, filters, interceptors
- rontend/src/app/ — Next.js App Router pages (/, /student, /teacher)
- rontend/src/lib/ — API client (pi.ts), utilities
