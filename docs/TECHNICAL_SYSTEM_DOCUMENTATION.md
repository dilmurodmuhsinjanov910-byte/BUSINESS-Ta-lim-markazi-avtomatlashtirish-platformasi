# BUSINESS V1: TEXNIK TIZIM HUJJATI (TECHNICAL SYSTEM DOCUMENTATION)

Ushbu hujjat **BUSINESS V1** Education Automation Platformasining arxitekturasi, texnik parametrlari, API protokollari, xavfsizlik talablari va xizmat ko‘rsatish qoidalarini belgilaydi.

---

## 1. Loyiha Ownership (Egalik Huquqlari)

Qat’iy qoidaga ko‘ra, loyihaning barcha resurslari bo‘yicha egalik ochiq bayon qilinadi:

| Resurs | Mas’ul / Egasi | Izoh |
| :--- | :--- | :--- |
| **Source Code (Kod bazasi)** | O‘quv markazi / Buyurtmachi | To‘liq repository huquqlari beriladi. |
| **Hosting & Server (VPS/Cloud)** | O‘quv markazi hisobida | Docker konteynerlarida ishlaydi. |
| **Domen (Domain)** | O‘quv markazi hisobida | SSL/HTTPS sertifikatlari bilan ta’minlanadi. |
| **Telegram Bot (@BotFather)** | Markaz rahbari / Owner nomida | Bot token hech qachon uchinchi shaxsga berilmaydi. |
| **PostgreSQL Database** | Markaz cloud/server hisobida | Kunlik avtomatik backup yoqiladi. |
| **AI API Billing (OpenAI/Claude)** | Markaz to‘lov hisobida | API xarajatlari markaz nomidagi karta orqali to‘lanadi. |

---

## 2. Texnologik Stek

- **Backend**: Node.js (v20+), NestJS, TypeScript, Prisma ORM
- **Database**: PostgreSQL 16 (Development bosqichida SQLite muqobili bilan)
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons
- **Bot Engine**: Telegraf / Telegram Bot API
- **AI Integratsiya**: OpenAI Function Calling (GPT-4o-mini / GPT-4o) + Guardrail Orchestrator
- **Xavfsizlik**: JWT Authentication, Role-based Access Control (RBAC), Helmet, Rate Limiting, Prompt Injection Sanitizer.

---

## 3. Zaxira Nusxalash (Backup Policy)

1. **Har kuni avtomatik zaxira**: Database to‘liq dump qilinadi va xavfsiz shifrlangan saqlagichga yuklanadi.
2. **Saqlash muddati (Retention)**: Kamida 7 kunlik (katta hajmda 30 kunlik) nusxa saqlanadi.
3. **Deploy va Migration oldidan**: Har qanday `prisma db push` yoki schema o‘zgarishidan oldin majburiy zaxira nusxa olinadi.
4. **Qayta tiklash (Restore) testi**: Har oyda bir marta backup faylidan bo‘sh test serveriga ma’lumotlarni muvaffaqiyatli tiklash sinovi o‘tkaziladi.

---

## 4. Texnik Support Tasnifi (Incident Classification)

| Daraja | Nomi | Ta’rifi | SLA (Reaksiya vaqti) |
| :--- | :--- | :--- | :--- |
| **P1** | **Critical (Favqulodda)** | Tizim umuman ishlamayapti, bot xabar olmayapti, backend yiqilgan. | 30 daqiqa ichida |
| **P2** | **Major (Jiddiy)** | Muhim modul (masalan, to‘lovlar yoki trial booking) ishlamayapti, ammo asosiy bot ishlayapti. | 2–4 soat ichida |
| **P3** | **Normal (Kichik)** | Kichik xatolik (UI nosozligi, matndagi xato, statistikadagi noaniqlik). | 24 soat ichida |
| **P4** | **Feature Request (Taklif)** | Yangi imkoniyat qo‘shish bo‘yicha taklif. | Kelgusi versiya (V2) rejasiga kiritiladi. |

---

## 5. Bug va Yangi Funksiya Farqi

- **BUG**: Texnik spetsifikatsiyada belgilangan va va’da qilingan funksiya ishlamasa (masalan: sinov darsi belgilanganda 24h oldin eslatma ketmasa).
- **YANGI FUNKSIYA (Feature Request)**: Loyiha spetsifikatsiyasidan tashqari qo‘shimcha talab (masalan: ota-onaga ham alohida SMS eslatma yuborish).
