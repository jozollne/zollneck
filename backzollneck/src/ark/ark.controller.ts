import { Controller, Get, Post, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ArkService } from './ark.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('ark')
export class ArkController {
  constructor(private readonly arkService: ArkService) { }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(): Promise<{ running: boolean }> {
    const running = await this.arkService.isServerRunning();
    return { running: running };
  }

  @Get('getCommand')
  getCommandlog() {
    return this.arkService.getCommandLog();
  }

  @Post('command')
  @UseGuards(JwtAuthGuard)
  async sendCommand(@Body('username') username: string, @Body('command') command: string): Promise<{ output: string }> {
    const output = await this.arkService.sendRconCommand(username, command);
    return { output };
  }

  @Post('start')
  @UseGuards(JwtAuthGuard)
  async startServer(): Promise<{ success: boolean }> {
    try {
      const response = await this.arkService.startServer();
      return { success: response };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('stop')
  @UseGuards(JwtAuthGuard)
  async stopServer(): Promise<{ success: boolean }> {
    try {
      const response = await this.arkService.stopServer();
      return { success: response };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
