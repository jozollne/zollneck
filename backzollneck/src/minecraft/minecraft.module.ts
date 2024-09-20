import { Module } from '@nestjs/common';
import { MinecraftService } from './minecraft.service';
import { MinecraftController } from './minecraft.controller';

@Module({
  controllers: [MinecraftController],
  providers: [MinecraftService],
})
export class MinecraftModule {}
