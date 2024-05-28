import { Module } from '@nestjs/common';
import { FormatFileController } from './format-file.controller';
import { FormatFileService } from './format-file.service';

@Module({
  controllers: [FormatFileController],
  providers: [FormatFileService],
})
export class FormatFileModule {}
