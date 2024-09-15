import { Module } from '@nestjs/common';
import { ScreenshotService } from './screenshot.service';
import { ScreenshotController } from './screenshot.controller';

@Module({
  controllers: [ScreenshotController],
  providers: [ScreenshotService],
})
export class ScreenshotModule {}
