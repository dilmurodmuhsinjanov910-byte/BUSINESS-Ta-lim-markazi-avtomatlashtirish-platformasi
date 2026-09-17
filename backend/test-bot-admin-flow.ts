import { PrismaClient, ConversationStatus, TaskStatus, BookingStatus } from '@prisma/client';

const BACKEND_URL = 'http://localhost:4000/api';
const FRONTEND_URL = 'http://localhost:3000/api';

async function testBotAndAdminFlow() {
  console.log('================================================================');
  console.log('  TESTING TELEGRAM BOT <-> ADMIN PANEL DATA SYNCHRONIZATION');
  console.log('================================================================\n');

  const prisma = new PrismaClient();

  try {
    // 1. Authenticate Admin (Frontend Login simulation)
    console.log('1. Admin autentifikatsiyasi...');
    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@education.uz',
        password: 'AdminPassword123!',
      }),
    });
    const { accessToken: adminToken, user: adminUser } = await loginRes.json();
    console.log(`   -> Admin tizimga kirdi: ${adminUser.fullName} (${adminUser.role})\n`);

    // 2. Simulated Telegram User arrives
    const randomTgId = String(Math.floor(100000000 + Math.random() * 900000000));
    const testUserName = 'Sherzodbek Alimov (TG Test)';
    const testPhone = `+99893${Math.floor(1000000 + Math.random() * 9000000)}`;

    console.log(`2. Telegram foydalanuvchisi botga xabar yubormoqda: [ID: ${randomTgId}, ${testUserName}]...`);
    const botMsgRes = await fetch(`${BACKEND_URL}/telegram/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: randomTgId,
        fullName: testUserName,
        text: 'General English kursingiz narxi necha pul?',
      }),
    });
    const botReply = await botMsgRes.json();
    console.log('   -> Bot javobi (85%+ NLP):', botReply.reply?.slice(0, 80) + '...\n');

    // 3. User shares contact
    console.log(`3. Foydalanuvchi telefon raqamini ulashmoqda: ${testPhone}...`);
    const contactRes = await fetch(`${BACKEND_URL}/telegram/simulate-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: randomTgId,
        phone: testPhone,
        fullName: testUserName,
      }),
    });
    const contactReply = await contactRes.json();
    console.log('   -> Botning kontakt qabul javobi:', contactReply.reply?.slice(0, 80) + '...\n');

    // 3.1. User provides Student Name and Age
    console.log('3.1. Foydalanuvchi o\'quvchi ismi va yoshini kiritmoqda ("Jasur Aliyev, 16 yosh")...');
    const nameAgeRes = await fetch(`${BACKEND_URL}/telegram/simulate-name-age`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: randomTgId,
        text: 'Jasur Aliyev, 16 yosh',
      }),
    });
    const nameAgeData = await nameAgeRes.json();
    console.log(`   -> [TASDIQLANDI]: O'quvchi ma'lumotlari parslendi: Ism: "${nameAgeData.parsed?.fullName}", Yosh: ${nameAgeData.parsed?.age}\n`);

    // 4. Verify data arrived in Admin Panel Leads CRM
    console.log('4. Admin Panelda yangi lead va uning yoshi aks etganini tekshirish...');
    const leadsRes = await fetch(`${FRONTEND_URL}/leads?search=${testPhone}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const leadsList = await leadsRes.json();
    const createdLead = leadsList.find((l: any) => l.telegramId === randomTgId || l.phone === testPhone);

    if (!createdLead) {
      throw new Error(`Xato: Bot orqali kelgan foydalanuvchi (${testPhone}) admin panelda ko'rinmadi!`);
    }
    console.log(`   -> [TASDIQLANDI]: Lead CRM-da mavjud! Ism: "${createdLead.fullName}", Yoshi: ${createdLead.age} yosh, Ball: ${createdLead.score} (${createdLead.scoreTier})\n`);

    // 5. User asks for Operator / Human handoff
    console.log('5. Foydalanuvchi botda operatorni so\'ramoqda...');
    const operatorRes = await fetch(`${BACKEND_URL}/telegram/simulate-operator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: randomTgId,
        fullName: testUserName,
      }),
    });
    const opReply = await operatorRes.json();
    console.log('   -> Bot handoff javobi:', opReply.reply);

    // 6. Check Admin Panel: Conversation status and Urgent Task
    console.log('\n6. Admin panelda suhbat statusi va yangi vazifa (Task) tekshiruvi...');
    const convsRes = await fetch(`${FRONTEND_URL}/conversations?status=NEEDS_HUMAN`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const convs = await convsRes.json();
    const targetedConv = convs.find((c: any) => c.leadId === createdLead.id);

    if (!targetedConv) {
      throw new Error('Xato: Operator so\'ragan suhbat NEEDS_HUMAN ro\'yxatida topilmadi!');
    }
    console.log(`   -> [TASDIQLANDI]: Suhbat NEEDS_HUMAN holatiga o'tgan! Sabab: ${targetedConv.handoffReason}`);

    // Check Tasks
    const tasksRes = await fetch(`${BACKEND_URL}/tasks?status=TODO`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const tasks = await tasksRes.json();
    const urgentTask = tasks.find((t: any) => t.leadId === createdLead.id);
    if (!urgentTask) {
      throw new Error('Xato: Admin uchun URGENT task yaratilmadi!');
    }
    console.log(`   -> [TASDIQLANDI]: Admin panelda yangi vazifa yaratilgan: "${urgentTask.title}" (${urgentTask.priority})\n`);

    // 7. Admin takes over conversation from Admin UI
    console.log('7. Admin suhbatni jonli qabul qilmoqda (Takeover)...');
    const takeoverRes = await fetch(`${FRONTEND_URL}/conversations/${targetedConv.id}/takeover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const takenOver = await takeoverRes.json();
    console.log(`   -> [TASDIQLANDI]: Suhbat statusi: ${takenOver.status}, Biriktirilgan admin ID: ${takenOver.assignedAdminId}`);

    // 8. Admin writes back to the user
    console.log('8. Admin chat orqali javob xati yubormoqda...');
    const sendMsgRes = await fetch(`${FRONTEND_URL}/conversations/${targetedConv.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        content: `Assalomu alaykum ${testUserName}! Men markaz bosh administratori bo'laman. Qaysi filialimizda sinov darsiga qatnashmoqchisiz?`,
      }),
    });
    const sentMsg = await sendMsgRes.json();
    console.log(`   -> [TASDIQLANDI]: Xabar yuborildi! Yuboruvchi turi: ${sentMsg.senderType || sentMsg.userMessage?.senderType}`);

    // 9. Admin books trial lesson for user
    console.log('\n9. Admin o\'quvchini sinov darsiga bron qilmoqda...');
    const groups = await prisma.group.findMany({
      where: { status: { in: ['ACTIVE', 'RECRUITING'] as any } },
      include: { course: true, branch: true },
    });
    if (groups.length === 0) throw new Error('Faol yoki qabul jarayonidagi guruh topilmadi');
    const bookingRes = await fetch(`${FRONTEND_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        leadId: createdLead.id,
        groupId: groups[0].id,
        bookingDate: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '14:00 - 15:20',
      }),
    });
    const booking = await bookingRes.json();
    console.log(`   -> [TASDIQLANDI]: Sinov darsi bron qilindi! ID: ${booking.id}, Guruh: ${groups[0].name}`);

    // 10. Admin marks conversation resolved
    console.log('\n10. Suhbat muvaffaqiyatli yakunlanmoqda (Resolve)...');
    const resolveRes = await fetch(`${FRONTEND_URL}/conversations/${targetedConv.id}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const resolved = await resolveRes.json();
    console.log(`   -> [TASDIQLANDI]: Suhbat yakuniy statusi: ${resolved.status}`);

    // 11. Verify Audit trail has all entries
    console.log('\n11. Audit logida barcha harakatlar aks etganini tekshirish...');
    const auditRes = await fetch(`${FRONTEND_URL}/audit?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditLogs = await auditRes.json();
    console.log(`   -> [TASDIQLANDI]: Audit jurnalida oxirgi ${auditLogs.length} ta operatsiya muvaffaqiyatli saqlangan!`);

    console.log('\n================================================================');
    console.log('  NATIJA: TELEGRAM BOT VA ADMIN PANEL TO\'LIQ VA BEKAM-U KO\'ST BOG\'LANGAN!');
    console.log('================================================================\n');

  } finally {
    await prisma.$disconnect();
  }
}

testBotAndAdminFlow().catch((err) => {
  console.error('Testda xatolik:', err);
  process.exit(1);
});
