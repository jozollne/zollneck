import { Module } from '@nestjs/common';
import { PokerService } from './poker.service';
import { PokerController } from './poker.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Poker } from './entities/history.entity'

@Module({
  controllers: [PokerController],
  providers: [PokerService],
  imports: [
    TypeOrmModule.forFeature([Poker]),
  ]
})
export class PokerModule {}
