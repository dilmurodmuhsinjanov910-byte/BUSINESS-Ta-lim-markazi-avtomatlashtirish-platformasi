import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { TeacherMessagesController } from './teacher-messages.controller';
import { TeacherMessagesService } from './teacher-messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [TeachersController, TeacherMessagesController],
  providers: [TeachersService, TeacherMessagesService],
  exports: [TeachersService, TeacherMessagesService],
})
export class TeachersModule {}
