# Original User Request

## Initial Request — 2026-09-17T17:35:42Z

Ta'lim markazi avtomatlashtirish platformasini (NestJS backend API, Next.js frontend boshqaruv paneli, Talaba va O'qituvchi Telegram Mini App lari) to'liq xavfsizlik auditi (pentesting) va brauzer orqali E2E funksional sinovdan o'tkazish hamda aniqlangan kamchiliklarni bartaraf etish.

Working directory: d:\talim moassalari 2
Integrity mode: development

## Requirements

### R1. Xavfsizlik va Kirib Borish Sinovi (Security & Penetration Testing)
Platformaning barcha tashqi va ichki nuqtalari bo'yicha to'liq xavfsizlik auditi o'tkazilsin:
- **Autentifikatsiya & RBAC**: JWT tokenlar tekshiruvi, muddati o'tgan tokenlar, ruxsatsiz kirish (unauthorized access) va rollarga asoslangan cheklovlar (SUPER_ADMIN, ADMIN, TEACHER, OPERATOR).
- **IDOR va Ruxsatlarni buzish**: Bir foydalanuvchi yoki talaba boshqa talabaning ma'lumotlarini (davomat, baho, to'lov) ko'ra olmasligi yoki o'zgartira olmasligi tekshirilsin.
- **Kiritish ma'lumotlari xavfsizligi (Injection & Validation)**: SQL/Prisma injection, XSS, noaniq yoki buzilgan parametrlar bilan API larga qilingan hujumlarga nisbatan chidamlilik.
- **Bot va Spam/Brute-force himoyasi**: Cheksiz so'rovlar (DoS/DDoS) va manipulyatsiyalarga qarshi mexanizmlar.

### R2. Brauzer va Interfeyslarni To'liq E2E Sinash (Browser Functional Testing)
Brauzer vositalari yordamida barcha asosiy interfeyslar va foydalanuvchi ssenariylari jonli sinovdan o'tkazilsin:
- **Boshqaruv Paneli (Admin Portal `http://localhost:3000`)**: Boshqaruv paneli (KPI va Funnel), Mijozlar jadvali, Sinov darslari taqvimi, Jonli suhbatlar (operator takeover), Kurslar & Guruhlar, Bilimlar bazasi (CRUD), Vazifalar hamda Davomat & Baholar jurnali.
- **Talaba Telegram Mini App (`http://localhost:3000/student`)**: Kurs ma'lumotlari, dars jadvali, davomat foizi, darsma-dars davomat belgilari, ustoz qo'ygan baholar va to'lov holati renderlanishi.
- **O'qituvchi Telegram Mini App (`http://localhost:3000/teacher`)**: Guruhlar ro'yxati, 1-tap kunlik davomat belgilash, o'quvchilarni baholash (ball va izoh kiritish), hamda saqlangandan so'ng Admin Panelga zudlik bilan uzatilishi.

### R3. Kamchiliklarni Bartaraf Etish va Regressiya Testlari (Remediation & Patching)
Sinov jarayonida aniqlangan har qanday xavfsizlik zaifligi yoki interfeys xatosi darhol tuzatilsin (patch). Mavjud 87 ta backend testlari va yangi yozilgan xavfsizlik testlarining barchasi muvaffaqiyatli (100% PASS) yakunlanishi ta'minlansin.

## Acceptance Criteria

### Security Audit Criteria
- [ ] Barcha himoyalangan API endpointlar autentifikatsiyasiz kirishga ruxsat bermaydi (`401 Unauthorized`).
- [ ] IDOR tekshiruvida bitta o'quvchi boshqa o'quvchining davomati yoki baholarini o'zgartira olmasligi tasdiqlangan.
- [ ] XSS va noto'g'ri maydonlar kiritilganda server barqaror ishlaydi va validation error qaytaradi.
- [ ] O'quvchi biriktirishda guruh sig'imi oshib ketishiga yo'l qo'yilmaydi.

### Browser Functional Criteria
- [ ] `http://localhost:3000` (Admin Portal) dagi barcha 9 ta bo'lim sahifa buzilmasdan va konsolda runtime xatolarsiz ochiladi.
- [ ] `http://localhost:3000/student` sahifasi mobil rejimda to'liq yuklanadi va barcha ma'lumotlar to'g'ri ko'rinadi.
- [ ] `http://localhost:3000/teacher` sahifasida davomat belgilash va baho qo'yish amallari muvaffaqiyatli saqlanadi.
- [ ] O'qituvchi tomonidan kiritilgan yangi ma'lumotlar Admin Panel "Davomat & Baholar" jadvalida real vaqtda aks etadi.

### Test & Build Integrity
- [ ] Backend test to'plami (`npm test`) 100% muvaffaqiyatli o'tadi (0 xatolik).
- [ ] Frontend loyihasi (`npm run build`) muvaffaqiyatli build bo'ladi.
- [ ] Barcha tuzatishlar va xulosalar bo'yicha to'liq hisobot taqdim etiladi.

## Follow-up — 2026-09-18T07:08:51Z

Execute comprehensive penetration testing, vulnerability identification, and security hardening for the "BUSINESS : Ta'lim markazi avtomatlashtirish platformasi" education platform (NestJS backend, Next.js frontend, Telegram Bot, and Telegram Mini App).

Working directory: d:\talim moassalari 2
Integrity mode: demo

## Requirements

### R1. Comprehensive Attack Surface Penetration Testing
Perform adversarial security testing across all platform interfaces:
1. **Authentication & Session Security**: Validate JWT handling, token tampering, missing expiration checks, secret strength, and brute-force resistance on `/api/auth/*`.
2. **Authorization & Privilege Escalation (RBAC & IDOR)**: Test for broken access control across roles (`SUPER_ADMIN`, `ADMIN`, `TEACHER`, `OPERATOR`, `STUDENT`). Verify that unauthorized users cannot view, edit, or delete leads, enrollments, groups, teachers, debtor payments, or teacher chat messages.
3. **Input Validation, Injection & Sanitization**: Probe all API inputs and URL parameters for injection risks (NoSQL/SQL injection, XSS in lead notes, invalid data types, unbounded payloads).
4. **Rate Limiting & DoS Protection**: Verify that the global and route-level rate limiting guards effectively throttle high-frequency requests across sensitive endpoints (`/api/auth/login`, `/api/bookings`, `/api/leads`, `/api/ai/chat`, `/api/telegram/simulate*`).

### R2. Telegram Bot and Mini App Boundary Security
1. **Telegram WebApp Authentication & IDOR**: Verify that student and teacher portal endpoints (`/api/enrollments/student/:identifier`, `/api/enrollments/teacher`, `/api/teacher-messages/*`) reject unauthorized identifier spoofing or cross-tenant data access.
2. **Bot Handler Guardrails**: Ensure Telegram command handlers strictly validate incoming `from.id` and reject unauthorized attempts to trigger teacher, admin, or payment flows.

### R3. Vulnerability Remediation & Automated Regression Hardening
For every vulnerability or security weakness discovered:
1. Implement clean, robust fixes (patches) in the codebase following standard security practices.
2. Add automated security test cases in `backend/src/security-pentest.spec.ts` (or relevant spec files) demonstrating that the attack vector is completely mitigated.
3. Ensure no regressions are introduced and that existing platform features remain 100% functional.

## Acceptance Criteria

### Automated Security & Regression Verification
- [ ] Security test suite in `backend` executes and passes all test suites (`npm test` passes 100%).
- [ ] Dedicated penetration test cases cover JWT tampering, privilege escalation, parameter injection, rate limiting, and Telegram WebApp IDOR protection.
- [ ] No unauthorized user can access or modify endpoints outside their assigned role permissions.
- [ ] Rate limiting reliably blocks flood requests with HTTP 429 Too Many Requests.
- [ ] `backend` builds cleanly with `npm run build` (0 TypeScript / NestJS build errors).
- [ ] `frontend` builds cleanly with `npm run build` (0 Next.js build errors).
- [ ] A structured security audit & remediation summary report is produced documenting:
  - Discovered vulnerabilities (Severity: Critical, High, Medium, Low)
  - Proof of Concept (PoC) / Attack vectors tested
  - Applied fixes and mitigation verification
