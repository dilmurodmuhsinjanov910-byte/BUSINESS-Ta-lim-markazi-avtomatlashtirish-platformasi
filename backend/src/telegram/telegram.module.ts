import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { LeadsModule } from '../leads/leads.module';
import { AiModule } from '../ai/ai.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { BookingsModule } from '../bookings/bookings.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [LeadsModule, AiModule, ConversationsModule, BookingsModule, GroupsModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
