import { Controller, Post, Get, Body, UseGuards, HttpStatus, HttpException, Req } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-users.dto';
import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { existsSync, writeFileSync } from 'fs';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async validateUser(@Body('email') email: string, @Body('password') password: string) {
    const result = await this.authService.login(email, password);
    return result;
  }

  @Post('create')
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      await this.authService.create(createUserDto.email, createUserDto.password, createUserDto.username, createUserDto.firstName, createUserDto.lastName);
      return { message: "Erstellung erfolgreich!" };
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  @Get('check-token')
  @UseGuards(JwtAuthGuard)
  testToken() {
    throw new HttpException('Token valid', HttpStatus.OK);;
  }

  @Get('secret')
  @UseGuards(JwtAuthGuard)
  async secret(@Req() req: Request) {
    const ip = req.ip;
    const now = new Date().toISOString();

    const log = `Anfrage von IP: ${ip} - Uhrzeit: ${now}\n`;

    const filePath = path.join('/home/jozollne/craked', 'CRAKED.txt');

    fs.appendFileSync(filePath, log, { flag: 'a' });

    const response = await this.authService.secret();
    return response;
  }
}