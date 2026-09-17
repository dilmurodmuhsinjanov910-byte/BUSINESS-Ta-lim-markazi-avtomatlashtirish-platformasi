import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { LeadsService } from '../leads/leads.service';
import { AiService } from '../ai/ai.service';
import { LeadSource } from '@prisma/client';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;

  constructor(
    private configService: ConfigService,
    private leadsService: LeadsService,
    private aiService: AiService,
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

    // /start command
    this.bot.start(async (ctx) => {
      const from = ctx.from;
      const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
      const telegramId = String(from.id);
      const username = from.username;

      // Upsert lead (deduplication by telegramId)
      const { lead } = await this.leadsService.upsertLead({
        fullName,
        phone: telegramId, // placeholder until phone is shared
        telegramId,
        telegramUsername: username,
        source: LeadSource.TELEGRAM,
        notes: 'Telegram bot orqali /start bosildi',
      });

      const welcomeText = `Assalomu alaykum, ${fullName}!\n\n` +
        `"Al-Xorazmiy" o'quv markazining rasmiy botiga xush kelibsiz!\n` +
        `Biz sizga sifatli ta'lim, malakali ustozlar va eng qulay sharoitlarni taklif qilamiz.\n\n` +
        `Quyidagi tugmalardan birini tanlang yoki savolingizni to'g'ridan-to'g'ri yozing:`;

      const keyboard = Markup.keyboard([
        ['📚 Kurslar va narxlar', '📍 Filiallarimiz'],
        ['🎁 Bepul sinov darsiga yozilish'],
        ['📞 Operator bilan bog\'lanish'],
      ]).resize();

      await ctx.reply(welcomeText, keyboard);
    });

    // Handle Quick Action Buttons
    this.bot.hears('📚 Kurslar va narxlar', async (ctx) => {
      await this.handleUserText(ctx, "Kurslar va narxlar haqida ma'lumot bering");
    });

    this.bot.hears('📍 Filiallarimiz', async (ctx) => {
      await this.handleUserText(ctx, "Filiallar manzillari va telefonlari qanday?");
    });

    this.bot.hears('🎁 Bepul sinov darsiga yozilish', async (ctx) => {
      await this.handleUserText(ctx, "Sinov darsiga qanday yozilsam bo'ladi?");
    });

    this.bot.hears('📞 Operator bilan bog\'lanish', async (ctx) => {
      await this.handleUserText(ctx, "Operator bilan bog'lang");
    });

    // Handle free text messages through AI orchestrator
    this.bot.on('text', async (ctx) => {
      await this.handleUserText(ctx, ctx.message.text);
    });
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
        phone: telegramId,
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
      await ctx.reply("Texnik sabablarga ko'ra xabaringiz qabul qilinmadi. Iltimos, qayta urinib ko'ring yoki ma'muriyat bilan bog'laning.");
    }
  }

  // Simulated telegram dispatch for testing or webhook
  async simulateIncomingMessage(telegramId: string, fullName: string, text: string) {
    const { lead } = await this.leadsService.upsertLead({
      fullName,
      phone: telegramId,
      telegramId,
      source: LeadSource.TELEGRAM,
    });

    return this.aiService.processUserMessage({
      leadId: lead.id,
      userMessage: text,
    });
  }
}
