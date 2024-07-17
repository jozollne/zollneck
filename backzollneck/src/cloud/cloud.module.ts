import { Module } from '@nestjs/common';
import { CloudService } from './cloud.service';
import { CloudController } from './cloud.controller';
import { SocketGateway } from '../socket.gateway';

@Module({
  controllers: [CloudController],
  providers: [CloudService, SocketGateway],
})
export class CloudModule {}
