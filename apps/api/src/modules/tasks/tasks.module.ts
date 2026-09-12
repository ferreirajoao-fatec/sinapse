import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module';
import { FilesModule } from '../files/files.module';
import { TaskColumnsService } from './task-columns.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [FilesModule, CalendarModule],
  controllers: [TasksController],
  providers: [TaskColumnsService, TasksService],
})
export class TasksModule {}
