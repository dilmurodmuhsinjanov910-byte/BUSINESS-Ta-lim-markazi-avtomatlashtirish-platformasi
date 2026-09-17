import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { LeadsService } from '../leads/leads.service';
import { AiService } from '../ai/ai.service';
import { ConversationsService } from '../conversations/conversations.service';
import { LeadSource, LeadStatus } from '@prisma/client';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;

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
      await this.bot.launch();
      this.logger.log('Telegram Bot muvaffaqiyatli ishga tushirildi (Polling).');
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
      await this.leadsService.upsertLead({
        fullName,
        telegramId,
        telegramUsername: username,
        source: LeadSource.TELEGRAM,
        notes: 'Telegram bot orqali /start bosildi',
      });

      const welcomeText =
        `Assalomu alaykum, ${fullName}!\n\n` +
        `"Al-Xorazmiy" o'quv markazining rasmiy botiga xush kelibsiz!\n` +
        `Biz sizga sifatli ta'lim, malakali ustozlar va eng qulay sharoitlarni taklif qilamiz.\n\n` +
        `To'liq ma'lumot olish va bepul darsga yozilish uchun quyidagi tugmalardan foydalaning:`;

      const keyboard = Markup.keyboard([
        [Markup.button.contactRequest('📱 Telefon raqamni ulashish')],
        ['📚 Kurslar va narxlar', '📍 Filiallarimiz'],
        ['🎁 Bepul sinov darsiga yozilish', '📞 Operator bilan bog\'lanish'],
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

    const cleanPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const reply =
      `Rahmat, ${fullName}! Telefon raqamingiz (${cleanPhone}) muvaffaqiyatli saqlandi.\n\n` +
      `Sizni qaysi kursimiz ko'proq qiziqtiradi?\n` +
      `Quyidagi tugmalardan birini tanlang yoki savolingizni yozing:`;

    const keyboard = Markup.keyboard([
      ['General English', 'IELTS Intensive'],
      ['Rus tili', '🎁 Bepul sinov darsiga yozilish'],
      ['📞 Operator bilan bog\'lanish'],
    ]).resize();

    return { lead, reply, keyboard };
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

      // Upsert lead
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

  async simulateOperatorRequest(telegramId: string, fullName: string) {
    return this.handleOperatorRequest(telegramId, fullName);
  }
}
