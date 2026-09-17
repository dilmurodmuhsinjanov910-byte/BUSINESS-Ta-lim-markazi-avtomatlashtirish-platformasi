import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { CoursesModule } from '../courses/courses.module';
import { BranchesModule } from '../branches/branches.module';
import { GroupsModule } from '../groups/groups.module';
import { LeadsModule } from '../leads/leads.module';
import { BookingsModule } from '../bookings/bookings.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    CoursesModule,
    BranchesModule,
    GroupsModule,
    LeadsModule,
    BookingsModule,
    KnowledgeBaseModule,
    ConversationsModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
