import { Module } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { YoutubeController } from './youtube.controller';
import { YoutubeGateway } from './youtube.gateway';

@Module({
  controllers: [YoutubeController],
  providers: [YoutubeService, YoutubeGateway],
})
export class YoutubeModule { }
