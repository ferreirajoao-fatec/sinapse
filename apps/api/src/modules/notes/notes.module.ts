import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ColaboracaoService } from './colaboracao/colaboracao.service';
import { GroupsService } from './groups.service';
import { NotesController } from './notes.controller';
import { PagesService } from './pages.service';
import { SectionsService } from './sections.service';
import { SharingService } from './sharing.service';
import { TagsService } from './tags.service';
import { TrashService } from './trash.service';

@Module({
  imports: [FilesModule],
  controllers: [NotesController],
  providers: [
    GroupsService,
    SectionsService,
    PagesService,
    TagsService,
    TrashService,
    SharingService,
    ColaboracaoService,
  ],
  exports: [GroupsService, PagesService, SharingService],
})
export class NotesModule {}
