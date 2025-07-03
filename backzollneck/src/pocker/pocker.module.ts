import { Module } from '@nestjs/common';
import { PockerService } from './pocker.service';
import { PockerController } from './pocker.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pocker } from './entities/history.entity'

@Module({
  controllers: [PockerController],
  providers: [PockerService],
  imports: [
    TypeOrmModule.forFeature([Pocker]),
  ]
})
export class PockerModule {}
