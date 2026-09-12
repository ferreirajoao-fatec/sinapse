import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { GroupsService } from './groups.service';
import { NotesController } from './notes.controller';
import { PagesService } from './pages.service';
import { SectionsService } from './sections.service';
import { TagsService } from './tags.service';
import { TrashService } from './trash.service';

@Module({
  imports: [FilesModule],
  controllers: [NotesController],
  providers: [GroupsService, SectionsService, PagesService, TagsService, TrashService],
  exports: [GroupsService, PagesService],
})
export class NotesModule {}
