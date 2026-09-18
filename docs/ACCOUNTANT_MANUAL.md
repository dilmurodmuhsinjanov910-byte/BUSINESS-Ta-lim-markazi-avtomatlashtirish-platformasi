# BUSINESS V1: BUXGALTERIYA VA MOLIYA QO‘LLANMASI (TRENING DASTURI)

Ushbu qo‘llanma o‘quv markazi moliya xodimlari va buxgalterlari uchun ishlab chiqilgan bo‘lib, o‘quv to‘lovlarini to‘g‘ri kiritish, qarzdorliklarni monitoring qilish va guruh hisobini yuritish tartibini belgilaydi.

---

## 1. Trening Dasturi (Davomiyligi: 1 – 1.5 soat)

| Blok | Mavzu | Davomiyligi | Asosiy maqsad |
| :--- | :--- | :--- | :--- |
| **1-blok** | **Buxgalter Rolining Huquqlari** | 15 daqiqa | Moliya xodimi faqat to‘lovlar va talabalar hisobini ko‘radi, kurs prompti yoki xodimlarni boshqarmaydi. |
| **2-blok** | **To‘lov Hisob-fakturasi Yaratish (Invoicing)** | 25 daqiqa | Talaba va kurs tanlash, oylik to‘lov miqdorini belgilash, to‘lov muddati (Due Date). |
| **3-blok** | **To‘lovni Qabul Qilish va Tasdiqlash (PAID)** | 20 daqiqa | Payme, Click, Naqd, Bank o‘tkazmasi orqali to‘langan pulni tasdiqlash. |
| **4-blok** | **Qarzdorlar (OVERDUE) va Eslatmalar** | 15 daqiqa | Muddatidan o‘tgan to‘lovlar ro‘yxati, avtomatik to‘lov eslatmalari. |
| **5-blok** | **Moliya Hisoboti va Audit** | 15 daqiqa | Kunlik/oylik tushum hisobotlari, o‘zgarishlar tarixi (Audit Log). |

---

## 2. To‘lov Holatlari (Payment Lifecycle)

```
[ PENDING ]  ───(To‘lov qabul qilindi)───►  [ PAID ] (O‘quvchi soni +1, Lead -> WON)
     │
     └───(Muddati o‘tib ketdi)───────────►  [ OVERDUE ] (Qarzdorlar ro‘yxatiga tushadi)
```

1. **PENDING**: To‘lov kutilmoqda.
2. **PAID**: To‘lov to‘liq qabul qilindi.
   - **Tizim avtomatik amallari:**
     - To‘lov statusi `PAID` ga o‘tadi;
     - Agar mijoz lead bo‘lsa, uning statusi avtomatik `WON` (Mijoz yutildi) holatiga o‘tadi va balli 100 qilinadi;
     - Tanlangan guruhdagi faol o‘quvchilar soni (`currentStudents`) avtomatik bittaga oshiriladi;
     - Audit jurnaliga kiritgan xodim, to‘lov turi va vaqt muhrlanadi.
3. **OVERDUE**: To‘lov muddati o‘tib ketgan qarzdor talaba.

---

## 3. To‘lov Kiritish Qoidalari
Har bir to‘lov qabul qilinganda quyidagi ma’lumotlar to‘liq saqlanadi:
- **Summa**: So‘mda (masalan: `850 000`);
- **To‘lov usuli**: `PAYME`, `CLICK`, `UZUM`, `CASH` (naqd), `CARD_TERMINAL`, `BANK_TRANSFER`;
- **Kvitansiya / Tranzaksiya ID**: Chek raqami (ixtiyoriy izohda);
- **Kiritgan xodim**: Tizimga kirgan xodim IDsi avtomatik qayd etiladi.

---

## 4. Xavfsizlik va Qat’iy Qoidalar
❌ To‘lov yozuvlarini bazadan butunlay o‘chirib tashlash taqiqlanadi (faqat `CANCELLED` statusi berilishi mumkin).
❌ AI bot hech qachon to‘lovni o‘zi «to‘landi» deb belgilamaydi — bu faqat vakolatli buxgalter yoki admin vakolatida.
❌ Har qanday to‘lov o‘zgarishi `Audit Log` jadvalida o‘zgarmas holatda saqlanadi.
