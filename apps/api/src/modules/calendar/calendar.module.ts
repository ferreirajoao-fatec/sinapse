import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarRemindersService } from './calendar-reminders.service';
import { CalendarService } from './calendar.service';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, CalendarRemindersService],
  exports: [CalendarService],
})
export class CalendarModule {}
