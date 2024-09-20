import { Controller, Get, Post, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { MinecraftService } from './minecraft.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('minecraft')
export class MinecraftController {
  constructor(private readonly minecraftService: MinecraftService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(): Promise<{ running: boolean }> {
    const running = await this.minecraftService.isServerRunning();
    return { running: running };
  }

  @Post('command')
  @UseGuards(JwtAuthGuard)
  async sendCommand(@Body('command') command: string): Promise<{ output: string }> {
    const output = await this.minecraftService.sendRconCommand(command);
    return { output };
  }

  @Post('start')
  @UseGuards(JwtAuthGuard)
  async startServer(): Promise<{ success: boolean }> {
    try {
      const response = await this.minecraftService.startServer();
      return { success: response };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('stop')
  @UseGuards(JwtAuthGuard)
  async stopServer(): Promise<{ success: boolean }> {
    try {
      const response = await this.minecraftService.stopServer();
      return { success: response };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
