import { Controller, Get, Post, Body, Param, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ArkService } from './ark.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('ark')
export class ArkController {
  constructor(private readonly arkService: ArkService) { }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(): Promise<{ running: boolean; joinable: boolean }> {
    const running = await this.arkService.isServerRunning();
    const joinable = running ? await this.arkService.isServerJoinable() : false;
    return { running, joinable };
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
  async startServer(@Body('username') username: string): Promise<{ success: boolean }> {
    try {
      const response = await this.arkService.startServer(username);
      return { success: response };
   } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('stop')
  @UseGuards(JwtAuthGuard)
  async stopServer(@Body('username') username: string): Promise<{ success: boolean }> {
    try {
      const response = await this.arkService.stopServer(username);
      return { success: response };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('config/:file')
  @UseGuards(JwtAuthGuard)
  async readConfig(@Param('file') file: string) {
    try {
      return await this.arkService.readConfigFile(file);
    } catch (error) {
      throw new HttpException(error?.message || 'Failed to read config', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('config/:file')
  @UseGuards(JwtAuthGuard)
  async writeConfig(
    @Param('file') file: string,
    @Body('content') content: string,
    @Body('username') username: string,
  ) {
    try {
      return await this.arkService.writeConfigFile(file, content, username);
    } catch (error) {
      throw new HttpException(error?.message || 'Failed to write config', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('audit')
  @UseGuards(JwtAuthGuard)
  async getAuditLog() {
    return this.arkService.getAuditLog(100);
  }

  @Get('admin-log')
  @UseGuards(JwtAuthGuard)
  async getAdminLog() {
    // Direkt vor dem Lesen einmal abfragen (best effort), damit aktuelle Einträge dabei sind
    try { await this.arkService.triggerAdminLogPoll(); } catch { /* ignore */ }
    return this.arkService.getAdminLog(200);
  }
}
