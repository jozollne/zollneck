import { Module } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { YoutubeController } from './youtube.controller';
import { SocketGateway } from '../socket.gateway';

@Module({
  controllers: [YoutubeController],
  providers: [YoutubeService, SocketGateway],
})
export class YoutubeModule { }
