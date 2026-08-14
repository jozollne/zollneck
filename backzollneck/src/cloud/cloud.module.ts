import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudService } from './cloud.service';
import { CloudController } from './cloud.controller';
import { SharedLinkService } from './shared-link.service';
import { SharedLinkController } from './shared-link.controller';
import { SharedLink } from './entities/shared-link.entity';
import { SharedLinkAccessLog } from './entities/shared-link-access-log.entity';
import { SocketGateway } from '../socket.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([SharedLink, SharedLinkAccessLog])],
  controllers: [CloudController, SharedLinkController],
  providers: [CloudService, SocketGateway, SharedLinkService],
})
export class CloudModule {}
