import { Module } from '@nestjs/common';
import { FormatFileController } from './fileConvertor.controller';
import { FormatFileService } from './fileConvertor.service';

@Module({
  controllers: [FormatFileController],
  providers: [FormatFileService],
})
export class FormatFileModule {}
