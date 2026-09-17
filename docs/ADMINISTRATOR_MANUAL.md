# BUSINESS V1: QABULXONA ADMINISTRATORI QO‘LLANMASI VA TRENING DASTURI

Ushbu qo‘llanma til o‘quv markazi qabulxona xodimlari (administratorlar va sotuv menejerlari) uchun mo‘ljallangan bo‘lib, platformaning barcha asosiy imkoniyatlaridan to‘g‘ri foydalanish va mijozlar bilan ishlash standartlarini belgilaydi.

---

## 1. Trening Dasturi (Davomiyligi: 2 soat)

| Blok | Mavzu | Davomiyligi | Asosiy maqsad |
| :--- | :--- | :--- | :--- |
| **1-blok** | **Dashboard va Tezkor Ko‘rsatkichlar** | 15 daqiqa | Bugungi yangi leadlar, triallar va shoshilinch vazifalarni monitoring qilish. |
| **2-blok** | **Leadlar bilan Ishlash va Statuslar** | 25 daqiqa | Yangi leadlarni ko‘rish, saralash, HOT/WARM/COLD statuslari va sabablar. |
| **3-blok** | **Trial Darslarga Yozish va Taqvimi** | 20 daqiqa | Sinov darsiga yozish, guruh sig‘imini nazorat qilish, vaqtni ko‘chirish. |
| **4-blok** | **Eslatmalar va Follow-up Tizimi** | 15 daqiqa | 24h va 2h oldingi avtomatik eslatmalar, kelmaganlar bilan aloqa. |
| **5-blok** | **AI Suhbatlari va Inson Handoff (Takeover)** | 25 daqiqa | AI suhbatini kuzatish, «Takeover» tugmasi orqali suhbatni o‘z zimmasiga olish. |
| **6-blok** | **Vazifalar (Tasks) va Hisobotlar** | 20 daqiqa | Kunlik qo‘ng‘iroq vazifalari, konversiya voronkasi tahlili. |

---

## 2. Asosiy Ishchi Jarayonlar (Workflows)

### 2.1. Leadlar Oqimi va Statuslar Mashinasi
- **NEW**: Tizimga Telegram bot yoki boshqa kanaldan yangi tushgan kontakt.
- **QUALIFIED**: Mijoz o‘z maqsadi (masalan, IELTS yoki General English), darajasi va qulay filialini bildirgan.
- **HOT (Ball: 70–100)**: Telefon bergan, filial va vaqtni tanlagan, darsga yozilishga tayyor. **Administrator birinchi navbatda shu leadlarga qo‘ng‘iroq qiladi!**
- **WARM (Ball: 40–69)**: Qiziqmoqda, lekin hali vaqt yoki kunni aniqlashtirmagan.
- **COLD (Ball: 0–39)**: Faqat narx so‘ragan yoki "keyinroq" deb javob bergan.
- **TRIAL_BOOKED**: Sinov darsiga aniq sana va vaqtga yozilgan.
- **TRIAL_ATTENDED**: Sinov darsiga kelgan (o‘qituvchi yoki admin tasdiqlagan).
- **TRIAL_MISSED**: Darsga kelmagan. Avtomatik ravishda 2 soat va 24 soatdan keyin tizim follow-up yuboradi.
- **WON**: Kursga yozildi va birinchi to‘lov qabul qilindi.
- **LOST**: Mijoz rad etdi. **Qat’iy qoida: Bekor qilish sababi majburiy tanlanadi** (Narx, Vaqt, Filial, Qiziqish yo‘q, Boshqa markaz, Javob bermadi).

### 2.2. Suhbatni Qo‘lga Olish (AI → Human Handoff)
AI quyidagi holatlarda suhbatni avtomatik ravishda `NEEDS_HUMAN` holatiga o‘tkazadi:
1. Mijoz *"operator"*, *"admin"*, *"odam bilan gaplashaman"* desa;
2. Narxni tushirish yoki noqonuniy chegirma so‘ralsa;
3. Shikoyat yoki norozilik bildirilsa;
4. To‘lov tizimidagi muammo bo‘lsa;
5. Savol bazada topilmasa.

**Administrator nima qiladi?**
1. Admin panelning **«Jonli Suhbatlar» (Conversations)** bo‘limiga o‘ting.
2. `NEEDS_HUMAN` (sariq ogohlantirish) belgisidagi suhbatni oching.
3. **«Suhbatni O‘z Zimmasiga Olish» (Takeover)** tugmasini bosing.
4. AI shu zahoti xabar yozishdan to‘xtaydi va siz mijozga bevosita javob yozasiz.
5. Masala hal bo‘lgach, **«Hal Qilindi» (Resolve)** tugmasini bosib, xohlasangiz AIni qayta faollashtirishingiz mumkin.

### 2.3. Trial Booking (Sinov Darsi) Qoidalari
- Guruh limiti to‘lgan bo‘lsa (masalan 12 kishilik guruhda 12 kishi band bo‘lsa), tizim 13-odamni yozishga yo‘l qo‘ymaydi.
- Bir o‘quvchini bitta guruhga bir vaqtning o‘zida ikki marta yozib bo‘lmaydi.
- Trial darsidan 24 soat va 2 soat oldin bot avtomatik eslatma (Reminder) yuboradi.

---

## 3. Taqiqlangan Harakatlar
❌ Mijozning telefon raqami yoki ismini boshqa mijozga aytish.
❌ Bazada yo‘q kurs, o‘qituvchi yoki narxlarni o‘zicha va’da qilish.
❌ ATTENDED (kelgan) darsni asossiz MISSED ga qaytarish (barcha harakatlar Audit Logda qayd etiladi).
