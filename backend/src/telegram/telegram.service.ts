import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { LeadsService } from '../leads/leads.service';
import { AiService } from '../ai/ai.service';
import { ConversationsService } from '../conversations/conversations.service';
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
        ['📞 Operator bilan bog\'lanish'],
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
      await ctx.reply(result.reply, { parse_mode: 'Markdown' });
    });

    this.bot.hears('❓ Savollaringiz bormi?', async (ctx) => {
      const faqText =
        `❓ *Savollaringiz bormi? Bemalol so'rang!*\n\n` +
        `Bizning aqlli yordamchimiz o'quv markazimiz bo'yicha har qanday savolingizga darhol javob beradi.\n\n` +
        `📌 *Quyidagi mavzularda bemalol savol berishingiz mumkin:*\n` +
        `• 📚 Kurslar narxlari va to'lov usullari (Payme, Click, naqd)\n` +
        `• ⏰ Dars jadvali (ertalabki, tushki, kechki guruhlar)\n` +
        `• 📍 Filiallarimiz manzillari va mo'ljallari\n` +
        `• 🎁 Bepul sinov darsiga yozilish qoidalari\n` +
        `• 👨‍🏫 O'qituvchilar malakasi va sertifikatlari\n` +
        `• 💰 Chegirmalar va maxsus aksiyalar\n\n` +
        `💡 *Savolingizni shunchaki pastdagi xabar yozish maydoniga yozib yuboring!*\n` +
        `Masalan: *"General English narxi qancha?"* yoki *"Chilonzor filiali qayerda joylashgan?"*`;
      await ctx.reply(faqText, { parse_mode: 'Markdown' }).catch(async () => {
        await ctx.reply(faqText);
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

  // Trial request handling
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

    let reply = "Sinov darsiga yozilish uchun ochiq guruhlar:\n\n";
    groups.forEach((g: any, idx: number) => {
      reply += `${idx + 1}. **${g.courseName}** (${g.name})\n` +
        `   • Filial: ${g.branchName}\n` +
        `   • Kunlar: ${g.daysOfWeek}\n` +
        `   • Vaqt: ${g.timeSlot}\n` +
        `   • Bo'sh joylar: ${g.availableSeats} ta\n\n`;
    });
    reply += "Qaysi filial va vaqt sizga qulay? Guruh nomini yozsangiz sizni ro'yxatga olamiz!";

    return { reply, groups, leadId: lead.id };
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
}
