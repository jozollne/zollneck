import { Module } from '@nestjs/common';
import { ArkService } from './ark.service';
import { ArkController } from './ark.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArkCommandLog } from './entities/arkCommandLog.entity';

@Module({
  controllers: [ArkController],
  providers: [ArkService],
  imports: [
    TypeOrmModule.forFeature([ArkCommandLog]),
  ]
})
export class ArkModule { }
