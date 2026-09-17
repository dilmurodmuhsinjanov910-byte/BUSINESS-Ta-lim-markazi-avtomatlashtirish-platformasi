import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { LeadsService } from '../leads/leads.service';
import { AiService } from '../ai/ai.service';
import { ConversationsService } from '../conversations/conversations.service';
import { BookingsService } from '../bookings/bookings.service';
import { GroupsService } from '../groups/groups.service';
import { LeadSource, LeadStatus, MessageSender } from '@prisma/client';

export function parseNameAndAge(text: string, fallbackName = 'Foydalanuvchi'): { fullName: string; age?: number } {
  const clean = text.trim();
  let age: number | undefined = undefined;

  // Extract 1-2 digit number representing age (typically 4 to 90)
  const ageMatch = clean.match(/(?:^|\D)(\d{1,2})(?:\s*yosh|\s*da|\b)/i);
  if (ageMatch) {
    const num = parseInt(ageMatch[1], 10);
    if (num >= 4 && num <= 90) {
      age = num;
    }
  }

  // Remove age and trailing suffixes
  let name = clean
    .replace(/(?:^|\D)\d{1,2}(?:\s*yosh(?:da)?|\s*da|\b)/gi, ' ')
    .replace(/[,;.\-_/\\()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If after removing numbers no name remains, keep fallback
  if (!name || name.length < 2) {
    name = fallbackName;
  }

  return { fullName: name, age };
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  private userStates = new Map<string, { step: 'AWAITING_NAME_AND_AGE'; leadId: string; convId: string }>();

  constructor(
    private configService: ConfigService,
    private leadsService: LeadsService,
    private aiService: AiService,
    private conversationsService: ConversationsService,
    private bookingsService: BookingsService,
    private groupsService: GroupsService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!token || token === 'mock_telegram_bot_token' || token.includes('mock')) {
      this.logger.warn('TELEGRAM_BOT_TOKEN haqiqiy emas (mock). Bot simulyatsiya rejimida ishlaydi.');
      return;
    }

    try {
      this.bot = new Telegraf(token);
      this.setupHandlers();

      // Register dispatcher for direct Admin -> Telegram replies
      this.conversationsService.registerTelegramDispatcher(async (telegramId, content) => {
        return this.sendMessageToTelegramUser(telegramId, content);
      });

      this.bot.launch().catch((err: any) => {
        this.logger.error('Telegram bot ishida xato:', err.message);
      });
      this.logger.log('Telegram Bot muvaffaqiyatli ishga tushirildi (Polling faol).');
    } catch (err: any) {
      this.logger.error('Telegram botni ishga tushirishda xato:', err.message);
    }
  }

  onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('SIGINT');
    }
  }

  private setupHandlers() {
    if (!this.bot) return;

    // 1. /start command: interactive welcome and initial qualification keyboard
    this.bot.start(async (ctx) => {
      const from = ctx.from;
      const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
      const telegramId = String(from.id);
      const username = from.username;

      // Upsert lead using telegramId without fake phone placeholder
      const { lead } = await this.leadsService.upsertLead({
        fullName,
        telegramId,
        telegramUsername: username,
        source: LeadSource.TELEGRAM,
        notes: 'Telegram bot orqali /start bosildi',
      });

      const conv = await this.conversationsService.findOrCreateForLead(lead.id, 'TELEGRAM');

      // Save /start and welcome in conversation messages
      await this.conversationsService.addMessage({
        conversationId: conv.id,
        senderType: MessageSender.USER,
        content: '/start',
      });

      const welcomeText =
        `Assalomu alaykum, ${fullName}!\n\n` +
        `"Al-Xorazmiy" o'quv markazining rasmiy botiga xush kelibsiz!\n` +
        `Biz sizga sifatli ta'lim, malakali ustozlar va eng qulay sharoitlarni taklif qilamiz.\n\n` +
        `To'liq ma'lumot olish va bepul darsga yozilish uchun quyidagi tugmalardan foydalaning:`;

      await this.conversationsService.addMessage({
        conversationId: conv.id,
        senderType: MessageSender.AI,
        content: welcomeText,
      });

      const keyboard = Markup.keyboard([
        [Markup.button.contactRequest('📱 Telefon raqamni ulashish')],
        ['📚 Kurslar va narxlar', '📍 Filiallarimiz'],
        ['🎁 Bepul sinov darsiga yozilish', '❓ Savollaringiz bormi?'],
        ['📱 Mening kabinetim', '📞 Operator bilan bog\'lanish'],
      ]).resize();

      await ctx.reply(welcomeText, keyboard);
    });

    // 2. Contact shared event: lead qualification flow step
    this.bot.on('contact', async (ctx) => {
      const from = ctx.from;
      const contact = ctx.message.contact;
      const phone = contact.phone_number;
      const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || contact.first_name || 'Foydalanuvchi';
      const telegramId = String(from.id);

      const result = await this.handleContactShared(telegramId, phone, fullName, from.username);
      await ctx.reply(result.reply, result.keyboard);
    });

    // 3. Quick Action Buttons
    this.bot.hears('📚 Kurslar va narxlar', async (ctx) => {
      await this.handleUserText(ctx, "Kurslar va narxlar haqida ma'lumot bering");
    });

    this.bot.hears('📍 Filiallarimiz', async (ctx) => {
      await this.handleUserText(ctx, "Filiallar manzillari va telefonlari qanday?");
    });

    this.bot.hears('🎁 Bepul sinov darsiga yozilish', async (ctx) => {
      const from = ctx.from;
      const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
      const result = await this.handleTrialRequest(String(from.id), fullName);
      if (result.inlineKeyboard) {
        await ctx.reply(result.reply, { parse_mode: 'Markdown', ...result.inlineKeyboard }).catch(async () => {
          await ctx.reply(result.reply, result.inlineKeyboard);
        });
      } else {
        await ctx.reply(result.reply);
      }
    });

    // Handle 1-tap trial booking inline callback
    this.bot.action(/^trial_book:(.+)$/, async (ctx) => {
      const groupId = ctx.match[1];
      const from = ctx.from;
      const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
      const result = await this.handleConfirmTrialBooking(String(from.id), fullName, groupId);
      await ctx.answerCbQuery(result.alertText || 'Muvaffaqiyatli band qilindi!').catch(() => {});
      await ctx.reply(result.reply, { parse_mode: 'Markdown' }).catch(async () => {
        await ctx.reply(result.reply);
      });
    });

    this.bot.action('cancel_trial_book', async (ctx) => {
      await ctx.answerCbQuery('Bekor qilindi').catch(() => {});
      await ctx.reply("Sinov darsiga yozilish bekor qilindi. Boshqa savollaringiz bo'lsa, bemalol so'rang!");
    });

    // Handle interactive FAQ Menu
    this.bot.hears('❓ Savollaringiz bormi?', async (ctx) => {
      const faqMenu = this.getFaqMenu();
      await ctx.reply(faqMenu.text, { parse_mode: 'Markdown', ...faqMenu.keyboard }).catch(async () => {
        await ctx.reply(faqMenu.text, faqMenu.keyboard);
      });
    });

    // Handle student mini app commands and button
    const replyStudentCabinet = async (ctx: any) => {
      const telegramId = String(ctx.from.id);
      const baseUrl = this.configService.get<string>('WEBAPP_BASE_URL') || 'http://localhost:3000';
      const webAppUrl = `${baseUrl}/student?telegramId=${telegramId}`;
      const isHttps = webAppUrl.startsWith('https://');

      const keyboard = Markup.inlineKeyboard([
        [
          isHttps
            ? Markup.button.webApp('📱 Mening kabinetim (Mini App)', webAppUrl)
            : Markup.button.url('📱 Mening kabinetim (Brauzerda)', webAppUrl),
        ],
      ]);

      const text =
        `🎓 **O'quvchi Kabineti (Telegram Mini App)**\n\n` +
        `Kurslaringiz, dars jadvali, davomat ko'rsatkichlari va o'qituvchingiz qo'ygan baholarni ko'rish uchun quyidagi tugmani bosing:`;

      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
        await ctx.reply(`${text}\n\nKabinet ssilkasi: ${webAppUrl}`);
      });
    };

    this.bot.hears('📱 Mening kabinetim', replyStudentCabinet);
    this.bot.command(['app', 'cabinet', 'mening_kabinetim', 'talaba'], replyStudentCabinet);

    // Handle teacher journal command
    this.bot.command(['teacher', 'ustoz', 'jurnal'], async (ctx) => {
      const baseUrl = this.configService.get<string>('WEBAPP_BASE_URL') || 'http://localhost:3000';
      const webAppUrl = `${baseUrl}/teacher`;
      const isHttps = webAppUrl.startsWith('https://');

      const keyboard = Markup.inlineKeyboard([
        [
          isHttps
            ? Markup.button.webApp("👨‍🏫 O'qituvchi jurnali (Mini App)", webAppUrl)
            : Markup.button.url("👨‍🏫 O'qituvchi jurnali (Brauzerda)", webAppUrl),
        ],
      ]);

      const text =
        `👨‍🏫 **O'qituvchi Jurnali (Telegram Mini App)**\n\n` +
        `Guruhlar bo'yicha talabalar ro'yxatini ko'rish, kunlik davomatni belgilash va baholarni to'g'ridan-to'g'ri Admin Panelga kiritish uchun quyidagi tugmani bosing:`;

      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
        await ctx.reply(`${text}\n\nJurnal ssilkasi: ${webAppUrl}`);
      });
    });

    // Handle FAQ inline callback actions
    this.bot.action(/^faq:(.+)$/, async (ctx) => {
      const faqKey = ctx.match[1];
      const from = ctx.from;
      const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
      const result = await this.handleFaqAnswer(String(from.id), fullName, faqKey);
      await ctx.answerCbQuery().catch(() => {});
      await ctx.reply(result.reply, { parse_mode: 'Markdown' }).catch(async () => {
        await ctx.reply(result.reply);
      });
    });

    this.bot.hears('General English', async (ctx) => {
      await this.handleUserText(ctx, "General English kursi narxi va darslari haqida ma'lumot bering");
    });

    this.bot.hears('IELTS Intensive', async (ctx) => {
      await this.handleUserText(ctx, "IELTS Intensive kursi narxi va darslari haqida ma'lumot bering");
    });

    this.bot.hears('Rus tili', async (ctx) => {
      await this.handleUserText(ctx, "Rus tili kursi narxi va darslari haqida ma'lumot bering");
    });

    this.bot.hears('📞 Operator bilan bog\'lanish', async (ctx) => {
      const from = ctx.from;
      const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
      const result = await this.handleOperatorRequest(String(from.id), fullName);
      await ctx.reply(result.reply);
    });

    // 4. Free text messages through AI orchestrator
    this.bot.on('text', async (ctx) => {
      await this.handleUserText(ctx, ctx.message.text);
    });
  }

  // Qualification Step: Contact sharing handler
  async handleContactShared(telegramId: string, phone: string, fullName: string, username?: string) {
    const { lead } = await this.leadsService.upsertLead({
      fullName,
      phone,
      telegramId,
      telegramUsername: username,
      source: LeadSource.TELEGRAM,
      initialScoreDelta: 15,
      notes: 'Telegram orqali telefon raqam tasdiqlandi (Contact sharing)',
    });

    await this.leadsService.updateStatus(lead.id, LeadStatus.QUALIFIED, undefined, 'system-telegram');
    const conv = await this.conversationsService.findOrCreateForLead(lead.id, 'TELEGRAM');

    const cleanPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Add contact sharing user message to conversation history
    await this.conversationsService.addMessage({
      conversationId: conv.id,
      senderType: MessageSender.USER,
      content: `📱 Telefon raqam ulashildi: ${cleanPhone}`,
    });

    const reply =
      `Rahmat! Telefon raqamingiz (${cleanPhone}) muvaffaqiyatli saqlandi.\n\n` +
      `📋 **Iltimos, o'quvchining to'liq ismi-familiyasi va yoshini kiriting:**\n` +
      `(Masalan: *Jasur Aliyev, 16 yosh* yoki *Madina 14*)`;

    // Save prompt to conversation history
    await this.conversationsService.addMessage({
      conversationId: conv.id,
      senderType: MessageSender.AI,
      content: reply,
    });

    // Set conversational state to await name and age
    this.userStates.set(telegramId, {
      step: 'AWAITING_NAME_AND_AGE',
      leadId: lead.id,
      convId: conv.id,
    });

    const keyboard = Markup.removeKeyboard();

    return { lead, reply, keyboard, conversationId: conv.id };
  }

  // Trial request handling with interactive Inline Buttons
  async handleTrialRequest(telegramId: string, fullName: string) {
    const { lead } = await this.leadsService.upsertLead({
      fullName,
      telegramId,
      source: LeadSource.TELEGRAM,
    });

    const groupsResult = await this.aiService.executeTool('getAvailableGroups', {});
    const groups = Array.isArray(groupsResult) ? groupsResult : [];
    if (groups.length === 0) {
      return {
        reply:
          "Hozirda barcha guruhlarimiz to'lgan. Biroq sizni navbatga kiritishimiz mumkin. Administratorimiz siz bilan bog'lanishini xohlaysizmi?",
        action: 'WAITLIST',
        leadId: lead.id,
      };
    }

    let reply =
      "🎁 **Bepul sinov darsiga yozilish**\n\n" +
      "Quyidagi ochiq guruhlardan birini tanlang. Tanlagan zahotingiz qabulxona tizimida joy siz uchun band qilinadi:\n\n";

    groups.forEach((g: any, idx: number) => {
      reply += `${idx + 1}. **${g.courseName}** (${g.name})\n` +
        `   • Filial: ${g.branchName}\n` +
        `   • Kunlar: ${g.daysOfWeek}\n` +
        `   • Vaqt: ${g.timeSlot}\n` +
        `   • Bo'sh o'rinlar: ${g.availableSeats} ta\n\n`;
    });

    const buttons = groups.map((g: any) => [
      Markup.button.callback(
        `👉 ${g.courseName} (${g.branchName.split(' ')[0]} - ${g.timeSlot})`,
        `trial_book:${g.id}`,
      ),
    ]);
    buttons.push([Markup.button.callback('❌ Bekor qilish', 'cancel_trial_book')]);

    return {
      reply,
      groups,
      inlineKeyboard: Markup.inlineKeyboard(buttons),
      leadId: lead.id,
    };
  }

  // 1-Tap Booking execution from inline callback
  async handleConfirmTrialBooking(telegramId: string, fullName: string, groupId: string) {
    const { lead } = await this.leadsService.upsertLead({
      fullName,
      telegramId,
      source: LeadSource.TELEGRAM,
    });

    const conv = await this.conversationsService.findOrCreateForLead(lead.id, 'TELEGRAM');

    // Default booking date: tomorrow at 10:00 AM
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 1);
    bookingDate.setHours(10, 0, 0, 0);

    try {
      const booking = await this.bookingsService.createBooking({
        leadId: lead.id,
        groupId,
        bookingDate: bookingDate.toISOString(),
        notes: 'Telegram bot orqali 1-bosishda bron qilindi',
      });

      const fullBooking = await this.bookingsService.findOne(booking.id);

      const dateStr = bookingDate.toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const courseName = fullBooking.group?.course?.name || 'Kurs';
      const groupName = fullBooking.group?.name || '';
      const branchName = fullBooking.branch?.name || '';
      const branchAddress = fullBooking.branch?.address || '';
      const timeSlot = fullBooking.timeSlot || `${fullBooking.group?.startTime} - ${fullBooking.group?.endTime}`;
      const days = fullBooking.group?.daysOfWeek || '';

      const reply =
        `🎉 **Tabriklaymiz! Siz muvaffaqiyatli sinov darsiga yozildingiz!**\n\n` +
        `📚 **Kurs:** ${courseName}\n` +
        `👥 **Guruh:** ${groupName}\n` +
        `📍 **Filial:** ${branchName} (${branchAddress})\n` +
        `📅 **Sana:** ${dateStr}\n` +
        `⏰ **Dars vaqti:** ${days}, ${timeSlot}\n\n` +
        `🔔 Dars boshlanishidan 24 soat va 2 soat oldin sizga eslatma yuboramiz.\n` +
        `Biz sizni o'quv markazimizda kutib qolamiz! 😊`;

      await this.conversationsService.addMessage({
        conversationId: conv.id,
        senderType: MessageSender.SYSTEM,
        content: `🎁 Sinov darsi band qilindi: ${courseName} (${groupName}) - ${branchName}`,
      });

      return {
        success: true,
        booking,
        reply,
        alertText: 'Sinov darsi muvaffaqiyatli band qilindi!',
      };
    } catch (err: any) {
      this.logger.warn(`Sinov darsini bron qilishda xato: ${err.message}`);
      const reply =
        `Kechirasiz, sinov darsini bron qilib bo'lmadi:\n*${err.message}*\n\n` +
        `Boshqa guruhni tanlashingiz yoki "📞 Operator bilan bog'lanish" orqali mutaxassis yordamidan foydalanishingiz mumkin.`;

      return {
        success: false,
        reply,
        alertText: err.message,
      };
    }
  }

  // FAQ Menu definitions
  getFaqMenu() {
    const text =
      `❓ **Eng ko'p beriladigan savollar (FAQ)**\n\n` +
      `Quyidagi mavzulardan birini tanlang va bir zumda to'liq ma'lumot oling, yoki savolingizni pastga erkin matn sifatida yozib qoldiring:`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('💰 Kurs narxlari va to\'lov', 'faq:pricing'),
        Markup.button.callback('⏰ Dars jadvali va kunlari', 'faq:schedule'),
      ],
      [
        Markup.button.callback('📍 Filiallar manzillari', 'faq:branches'),
        Markup.button.callback('👨‍🏫 O\'qituvchilar tarkibi', 'faq:teachers'),
      ],
      [
        Markup.button.callback('🎁 Bepul dars tartibi', 'faq:trial'),
        Markup.button.callback('📞 Operatorga ulanish', 'faq:operator'),
      ],
    ]);

    return { text, keyboard };
  }

  // Answer selected FAQ item instantly
  async handleFaqAnswer(telegramId: string, fullName: string, faqKey: string) {
    const { lead } = await this.leadsService.upsertLead({
      fullName,
      telegramId,
      source: LeadSource.TELEGRAM,
    });
    const conv = await this.conversationsService.findOrCreateForLead(lead.id, 'TELEGRAM');

    let reply = '';
    const action = 'FAQ_' + faqKey.toUpperCase();

    if (faqKey === 'pricing') {
      reply =
        `💰 **Kurslarimizning rasmiy narxlari va to'lov usullari:**\n\n` +
        `• 🇬🇧 **General English (Beginner - Advanced):** 450,000 - 520,000 so'm/oy\n` +
        `• 🎯 **IELTS Intensive (Band 7.0+):** 750,000 so'm/oy (Barcha Mock Examlar bepul)\n` +
        `• 🇷🇺 **Rus tili (So'zlashuv va Grammatika):** 420,000 so'm/oy\n\n` +
        `💳 **To'lov usullari:** Click, Payme, Uzum va naqd pul. Barcha to'lovlarga qonuniy chek taqdim etiladi.\n` +
        `👨‍👩‍👦 Bir oiladan 2 va undan ortiq o'quvchi uchun **10% doimiy chegirma** mavjud!`;
    } else if (faqKey === 'schedule') {
      reply =
        `⏰ **Dars jadvallari va kunlari:**\n\n` +
        `• **Toq kunlar:** Dushanba - Chorshanba - Juma\n` +
        `• **Juft kunlar:** Seshanba - Payshanba - Shanba\n\n` +
        `🕒 **Qulay vaqt smenalari:**\n` +
        `• Ertalabki: 09:00 - 10:20\n` +
        `• Tushki: 14:00 - 15:20\n` +
        `• Kechki: 18:30 - 20:00\n\n` +
        `Darslar 80-90 daqiqadan haftada 3 marotaba olib boriladi.`;
    } else if (faqKey === 'branches') {
      reply =
        `📍 **Bizning filiallarimiz:**\n\n` +
        `1. **Chilonzor filiali:**\n` +
        `   • Mo'ljal: Chilonzor metro bekati, 2-chiqish, 12-uy\n` +
        `   • Telefon: +998 71 200 11 22\n` +
        `   • Ish vaqti: 08:30 - 20:30 (Dush-Shanba)\n\n` +
        `2. **Yunusobod filiali:**\n` +
        `   • Mo'ljal: Shahriston metrosi yaqinida, Amir Temur ko'chasi 45-uy\n` +
        `   • Telefon: +998 71 200 33 44\n` +
        `   • Ish vaqti: 08:30 - 20:30 (Dush-Shanba)`;
    } else if (faqKey === 'teachers') {
      reply =
        `👨‍🏫 **O'qituvchilarimiz malakasi:**\n\n` +
        `• Markazimiz ustozlari xalqaro **IELTS 8.0 - 8.5** va **CELTA / TESOL** sertifikatlariga ega.\n` +
        `• O'rtacha 5+ yillik pedagogik tajriba.\n` +
        `• Zamonaviy interaktiv metodika va individual yondashuv kafolatlanadi.`;
    } else if (faqKey === 'trial') {
      reply =
        `🎁 **Bepul sinov darsi shartlari:**\n\n` +
        `• Birinchi dars 100% BEPUL.\n` +
        `• Darsda o'qituvchi bilan tanishasiz, muhitni ko'rasiz va bilim darajangiz (Placement test) aniqlanadi.\n` +
        `• Dars sizga ma'qul kelsa, guruhga a'zo bo'lasiz.\n\n` +
        `Sinov darsiga yozilish uchun "🎁 Bepul sinov darsiga yozilish" tugmasini bosing!`;
    } else if (faqKey === 'operator') {
      const opResult = await this.handleOperatorRequest(telegramId, fullName);
      return {
        reply: opResult.reply,
        action: 'FAQ_OPERATOR',
        conversationId: opResult.conversationId,
        leadId: opResult.leadId,
      };
    } else {
      reply = "Kechirasiz, ushbu bo'lim bo'yicha ma'lumot topilmadi.";
    }

    // Save user interaction to conversation history
    await this.conversationsService.addMessage({
      conversationId: conv.id,
      senderType: MessageSender.USER,
      content: `[FAQ so'rovi]: ${faqKey}`,
    });
    await this.conversationsService.addMessage({
      conversationId: conv.id,
      senderType: MessageSender.AI,
      content: reply,
    });

    return { reply, action };
  }

  // Human handoff request routing
  async handleOperatorRequest(telegramId: string, fullName: string) {
    const { lead } = await this.leadsService.upsertLead({
      fullName,
      telegramId,
      source: LeadSource.TELEGRAM,
    });

    const conv = await this.conversationsService.findOrCreateForLead(lead.id, 'TELEGRAM');
    await this.conversationsService.triggerHandoff(conv.id, 'OPERATOR_REQUEST');

    return {
      reply:
        "Murojaatingiz qabul qilindi! Suhbat administratorimizga yo'naltirildi. Mutaxassis tez orada siz bilan bog'lanadi.",
      conversationId: conv.id,
      leadId: lead.id,
    };
  }

  private async handleUserText(ctx: any, userText: string) {
    try {
      const from = ctx.from;
      const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
      const telegramId = String(from.id);
      const username = from.username;

      // Check if user is in AWAITING_NAME_AND_AGE state
      const state = this.userStates.get(telegramId);
      if (state && state.step === 'AWAITING_NAME_AND_AGE') {
        const parsed = parseNameAndAge(userText, fullName);

        // Update lead with real student name and age
        const { lead } = await this.leadsService.upsertLead({
          fullName: parsed.fullName,
          age: parsed.age,
          telegramId,
          notes: parsed.age ? `O'quvchi yoshi: ${parsed.age}` : undefined,
        });

        // Add user message to conversation history
        await this.conversationsService.addMessage({
          conversationId: state.convId,
          senderType: MessageSender.USER,
          content: userText,
        });

        // Clear state
        this.userStates.delete(telegramId);

        const confirmReply =
          `✅ **Ma'lumotlaringiz muvaffaqiyatli saqlandi!**\n\n` +
          `👤 **O'quvchi:** ${parsed.fullName}\n` +
          (parsed.age ? `🎂 **Yoshi:** ${parsed.age} yosh\n\n` : '\n') +
          `Sizni qaysi kursimiz ko'proq qiziqtiradi?\n` +
          `Quyidagi tugmalardan birini tanlang yoki savolingizni bemalol yozing:`;

        // Save AI reply in conversation history
        await this.conversationsService.addMessage({
          conversationId: state.convId,
          senderType: MessageSender.AI,
          content: confirmReply,
        });

        const keyboard = Markup.keyboard([
          ['General English', 'IELTS Intensive'],
          ['Rus tili', '🎁 Bepul sinov darsiga yozilish'],
          ['❓ Savollaringiz bormi?', '📞 Operator bilan bog\'lanish'],
        ]).resize();

        await ctx.reply(confirmReply, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
          await ctx.reply(confirmReply, keyboard);
        });
        return;
      }

      // Normal flow: Upsert lead
      const { lead } = await this.leadsService.upsertLead({
        fullName,
        telegramId,
        telegramUsername: username,
        source: LeadSource.TELEGRAM,
      });

      // Pass through AI Orchestrator
      const aiResponse = await this.aiService.processUserMessage({
        leadId: lead.id,
        userMessage: userText,
      });

      await ctx.reply(aiResponse.reply, { parse_mode: 'Markdown' }).catch(async () => {
        // Fallback without parse_mode if markdown has unescaped characters
        await ctx.reply(aiResponse.reply);
      });
    } catch (err: any) {
      this.logger.error('Telegram xabarini ishlashda xato:', err.stack);
      await ctx.reply(
        "Texnik sabablarga ko'ra xabaringiz qabul qilinmadi. Iltimos, qayta urinib ko'ring yoki ma'muriyat bilan bog'laning.",
      );
    }
  }

  // Send message directly to Telegram user from Admin
  async sendMessageToTelegramUser(telegramId: string, text: string) {
    if (this.bot) {
      try {
        await this.bot.telegram.sendMessage(telegramId, `👤 **Administrator:**\n${text}`, { parse_mode: 'Markdown' }).catch(async () => {
          await this.bot!.telegram.sendMessage(telegramId, `Administrator:\n${text}`);
        });
        return true;
      } catch (err: any) {
        this.logger.error(`Telegramga xabar yuborishda xato [${telegramId}]: ${err.message}`);
        return false;
      }
    }
    return false;
  }

  // Send interactive enrollment notification with Mini App button
  async sendEnrollmentNotification(
    telegramId: string,
    courseName: string,
    groupName: string,
    schedule: string,
    webAppUrl: string,
  ) {
    const text =
      `🎉 **Tabriklaymiz! Siz kursga muvaffaqiyatli qabul qilindingiz!**\n\n` +
      `📚 **Kurs:** ${courseName}\n` +
      `👥 **Guruh:** ${groupName}\n` +
      `🗓 **Dars vaqti:** ${schedule}\n\n` +
      `📱 Shaxsiy talaba kabinetingizga (Telegram Mini App) kirish uchun quyidagi tugmani bosing. Unda dars jadvali, oylik to'lov, davomatingiz va ustozingiz qo'ygan baholarni ko'rishingiz mumkin:`;

    if (this.bot) {
      try {
        const isHttps = webAppUrl.startsWith('https://');
        const keyboard = Markup.inlineKeyboard([
          [
            isHttps
              ? Markup.button.webApp('📱 Mening kabinetim (Mini App)', webAppUrl)
              : Markup.button.url('📱 Mening kabinetim (Brauzerda)', webAppUrl),
          ],
        ]);

        await this.bot.telegram
          .sendMessage(telegramId, text, {
            parse_mode: 'Markdown',
            ...keyboard,
          })
          .catch(async () => {
            await this.bot!.telegram.sendMessage(telegramId, `${text}\n\nKabinet ssilkasi: ${webAppUrl}`);
          });
        return true;
      } catch (err: any) {
        this.logger.error(`sendEnrollmentNotification xatosi [${telegramId}]: ${err.message}`);
        return false;
      }
    }
    return false;
  }

  // Simulated telegram dispatch for testing or webhook
  async simulateIncomingMessage(telegramId: string, fullName: string, text: string) {
    const { lead } = await this.leadsService.upsertLead({
      fullName,
      telegramId,
      source: LeadSource.TELEGRAM,
    });

    return this.aiService.processUserMessage({
      leadId: lead.id,
      userMessage: text,
    });
  }

  async simulateContactShared(telegramId: string, phone: string, fullName: string) {
    return this.handleContactShared(telegramId, phone, fullName);
  }

  async simulateNameAndAgeInput(telegramId: string, text: string) {
    const state = this.userStates.get(telegramId);
    const parsed = parseNameAndAge(text);

    const { lead } = await this.leadsService.upsertLead({
      fullName: parsed.fullName,
      age: parsed.age,
      telegramId,
      notes: parsed.age ? `O'quvchi yoshi: ${parsed.age}` : undefined,
    });

    if (state?.convId) {
      await this.conversationsService.addMessage({
        conversationId: state.convId,
        senderType: MessageSender.USER,
        content: text,
      });

      const confirmReply =
        `✅ Ma'lumotlar saqlandi: ${parsed.fullName}` +
        (parsed.age ? `, ${parsed.age} yosh` : '');

      await this.conversationsService.addMessage({
        conversationId: state.convId,
        senderType: MessageSender.AI,
        content: confirmReply,
      });

      this.userStates.delete(telegramId);
    }

    return { lead, parsed };
  }

  async simulateOperatorRequest(telegramId: string, fullName: string) {
    return this.handleOperatorRequest(telegramId, fullName);
  }

  async simulateTrialRequest(telegramId: string, fullName: string) {
    return this.handleTrialRequest(telegramId, fullName);
  }

  async simulateTrialConfirm(telegramId: string, fullName: string, groupId: string) {
    return this.handleConfirmTrialBooking(telegramId, fullName, groupId);
  }

  async simulateFaq(telegramId: string, fullName: string, faqKey: string) {
    return this.handleFaqAnswer(telegramId, fullName, faqKey);
  }
}
