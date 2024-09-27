import { Module } from '@nestjs/common';
import { MinecraftService } from './minecraft.service';
import { MinecraftController } from './minecraft.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandLog } from './entities/commandLog.entity'

@Module({
  controllers: [MinecraftController],
  providers: [MinecraftService],
  imports: [
    TypeOrmModule.forFeature([CommandLog]),
  ]
})
export class MinecraftModule {}
