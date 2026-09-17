import { PrismaClient, Role, LeadStatus, LeadSource, ScoreTier, GroupStatus, ArticleStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: "Al-Xorazmiy Ta'lim Markazi",
      legalName: "LLC Al-Xorazmiy Academy",
      phone: "+998712001122",
      email: "info@al-xorazmiy.uz",
      address: "Toshkent sh., Amir Temur shoh ko'chasi 45-uy",
    },
  });

  // 2. Create Branches
  const branchChilonzor = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: "Chilonzor filiali",
      address: "Toshkent sh., Chilonzor 9-mavze, Qatortol ko'chasi 12-bino",
      phone: "+998712001123",
      latitude: 41.2825,
      longitude: 69.2134,
      isActive: true,
    },
  });

  const branchYunusobod = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: "Yunusobod filiali",
      address: "Toshkent sh., Yunusobod 14-mavze, Ahmad Donish ko'chasi 7-uy",
      phone: "+998712001124",
      latitude: 41.3654,
      longitude: 69.2891,
      isActive: true,
    },
  });

  // 3. Create Admin User
  const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@education.uz' },
    update: {},
    create: {
      email: 'admin@education.uz',
      passwordHash,
      fullName: 'Bosh Administrator',
      role: Role.SUPER_ADMIN,
      phone: '+998901234567',
      branchId: branchChilonzor.id,
    },
  });

  // 4. Create Verified Course Catalog
  const courseEnglishBeg = await prisma.course.create({
    data: {
      name: "General English (Beginner)",
      description: "Noldan boshlovchilar uchun ingliz tili kursi. Grammatika va asosiy so'z boyligi.",
      language: "English",
      level: "Beginner",
      monthlyPrice: 450000,
      durationMonths: 3,
      lessonsPerWeek: 3,
      lessonDurationMinutes: 80,
      isActive: true,
    },
  });

  const courseEnglishInt = await prisma.course.create({
    data: {
      name: "General English (Intermediate)",
      description: "O'rta darajadagi o'quvchilar uchun ravon muloqot va akademik ko'nikmalar.",
      language: "English",
      level: "Intermediate",
      monthlyPrice: 520000,
      durationMonths: 3,
      lessonsPerWeek: 3,
      lessonDurationMinutes: 80,
      isActive: true,
    },
  });

  const courseIelts = await prisma.course.create({
    data: {
      name: "IELTS Intensive",
      description: "IELTS 7.0+ ball olish uchun intensiv tayyorgarlik kursi: Reading, Listening, Writing, Speaking.",
      language: "English",
      level: "Upper-Intermediate",
      monthlyPrice: 750000,
      durationMonths: 2,
      lessonsPerWeek: 3,
      lessonDurationMinutes: 90,
      isActive: true,
    },
  });

  const courseRussian = await prisma.course.create({
    data: {
      name: "Rus tili (So'zlashuv)",
      description: "Rus tilida erkin muloqot qilish, to'g'ri talaffuz va kundalik leksika.",
      language: "Russian",
      level: "Elementary",
      monthlyPrice: 420000,
      durationMonths: 3,
      lessonsPerWeek: 3,
      lessonDurationMinutes: 80,
      isActive: true,
    },
  });

  // 5. Create Sample Groups
  const group1 = await prisma.group.create({
    data: {
      name: "ENG-BEG-101",
      courseId: courseEnglishBeg.id,
      branchId: branchChilonzor.id,
      daysOfWeek: "Dushanba - Chorshanba - Juma",
      startTime: "10:00",
      endTime: "11:20",
      roomNumber: "201-xona",
      maxStudents: 12,
      currentStudents: 6,
      status: GroupStatus.RECRUITING,
    },
  });

  const group2 = await prisma.group.create({
    data: {
      name: "ENG-INT-202",
      courseId: courseEnglishInt.id,
      branchId: branchChilonzor.id,
      daysOfWeek: "Seshanba - Payshanba - Shanba",
      startTime: "14:00",
      endTime: "15:20",
      roomNumber: "203-xona",
      maxStudents: 12,
      currentStudents: 12,
      status: GroupStatus.FULL,
    },
  });

  const group3 = await prisma.group.create({
    data: {
      name: "IELTS-301",
      courseId: courseIelts.id,
      branchId: branchYunusobod.id,
      daysOfWeek: "Dushanba - Chorshanba - Juma",
      startTime: "16:00",
      endTime: "17:30",
      roomNumber: "105-xona",
      maxStudents: 10,
      currentStudents: 5,
      status: GroupStatus.RECRUITING,
    },
  });

  // 6. Create Knowledge Base Articles (PUBLISHED for AI zero-hallucination querying)
  await prisma.knowledgeBaseArticle.createMany({
    data: [
      {
        title: "Kurslar va narxlar katalogi (Rasmiy)",
        category: "PRICING",
        content: `O'quv markazimizning rasmiy kurs narxlari:
1. General English (Beginner): Oylik to'lov 450,000 so'm. Davomiyligi 3 oy, haftada 3 kun, dars 80 daqiqa.
2. General English (Intermediate): Oylik to'lov 520,000 so'm. Davomiyligi 3 oy, haftada 3 kun, dars 80 daqiqa.
3. IELTS Intensive: Oylik to'lov 750,000 so'm. Davomiyligi 2 oy, haftada 3 kun, dars 90 daqiqa.
4. Rus tili (So'zlashuv): Oylik to'lov 420,000 so'm. Davomiyligi 3 oy, haftada 3 kun, dars 80 daqiqa.

Chegirmalar: Bir oiladan ikki kishi qatnashsa har biriga 10% chegirma beriladi. 3 oylik to'lov birdaniga to'lansa 15% chegirma mavjud.`,
        tags: "narxlar, tolov, kurslar, chegirmalar",
        status: ArticleStatus.PUBLISHED,
      },
      {
        title: "Bepul sinov darsi (Trial lesson) qoidalari",
        category: "RULES",
        content: `Sinov darsiga yozilish tartibi:
- Yangi o'quvchilar uchun birinchi sinov darsi mutlaqo bepul!
- Sinov darsi davomida o'qituvchi sizning bilim darajangizni aniqlaydi va sizga mos guruhni tavsiya qiladi.
- Sinov darsiga oldindan ro'yxatdan o'tish shart.
- Guruhda bo'sh joy bo'lmagan taqdirda sinov darsi bron qilinmaydi.
- Dars boshlanishidan kamida 15 daqiqa oldin filialga shaxsni tasdiqlovchi hujjat bilan kelish talab etiladi.`,
        tags: "sinov darsi, bepul dars, trial, qoidalar",
        status: ArticleStatus.PUBLISHED,
      },
      {
        title: "Filiallarimiz va aloqa ma'lumotlari",
        category: "BRANCHES",
        content: `Bizning filiallarimiz:
1. Chilonzor filiali:
   Manzil: Toshkent sh., Chilonzor 9-mavze, Qatortol ko'chasi 12-bino. Mo'ljal: Rayhon milliy taomlari ro'parasi.
   Telefon: +998 71 200-11-23.
   Ish vaqti: Dushanba - Shanba, 08:30 dan 20:30 gacha.

2. Yunusobod filiali:
   Manzil: Toshkent sh., Yunusobod 14-mavze, Ahmad Donish ko'chasi 7-uy. Mo'ljal: Megaplanet savdo markazi yaqinida.
   Telefon: +998 71 200-11-24.
   Ish vaqti: Dushanba - Shanba, 08:30 dan 20:30 gacha.`,
        tags: "filiallar, manzil, telefon, ish vaqti",
        status: ArticleStatus.PUBLISHED,
      },
      {
        title: "To'lov usullari",
        category: "PAYMENT",
        content: `To'lovlarni quyidagi usullarda amalga oshirishingiz mumkin:
- Naqd pul yoki bank kartasi orqali filial qabulxonasida
- Click, Payme, Uzum Bank ilovalari orqali masofadan to'lov
- Yuridik shaxslar uchun bank hisob raqami orqali o'tkazma
Har bir to'lov bo'yicha rasmiy chek taqdim etiladi.`,
        tags: "click, payme, uzum, naqd, tolov",
        status: ArticleStatus.PUBLISHED,
      },
    ],
  });

  // 7. Create Sample Leads
  const lead1 = await prisma.lead.create({
    data: {
      fullName: "Jasur Rahimov",
      phone: "+998901112233",
      telegramId: "123456789",
      telegramUsername: "jasur_r",
      source: LeadSource.TELEGRAM,
      score: 85,
      scoreTier: ScoreTier.HOT,
      status: LeadStatus.TRIAL_BOOKED,
      preferredBranchId: branchChilonzor.id,
      preferredCourse: "General English (Beginner)",
      activities: {
        create: [
          {
            type: "STATUS_CHANGE",
            title: "Lead yaratildi",
            description: "Telegram bot orqali murojaat qildi",
          },
          {
            type: "TRIAL_BOOKED",
            title: "Sinov darsiga yozildi",
            description: "ENG-BEG-101 guruhiga sinov darsi bron qilindi",
          },
        ],
      },
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      fullName: "Malika Karimova",
      phone: "+998933334455",
      telegramId: "987654321",
      telegramUsername: "malika_k",
      source: LeadSource.INSTAGRAM,
      score: 55,
      scoreTier: ScoreTier.WARM,
      status: LeadStatus.CONTACTED,
      preferredBranchId: branchYunusobod.id,
      preferredCourse: "IELTS Intensive",
      activities: {
        create: [
          {
            type: "STATUS_CHANGE",
            title: "Lead yaratildi",
            description: "Instagram reklamasi orqali kirdi",
          },
          {
            type: "NOTE",
            title: "Qo'ng'iroq qilindi",
            description: "Kurs detallari tushuntirildi, ertaga qayta qo'ng'iroq qilishni so'radi",
          },
        ],
      },
    },
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
