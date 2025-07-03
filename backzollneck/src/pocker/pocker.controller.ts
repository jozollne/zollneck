import { Controller, Get, Post, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { PockerService } from './pocker.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateHistoryDto } from './dto/create-history.dto';

@Controller('pocker')
export class PockerController {
  constructor(private readonly pockerService: PockerService) { }

  @Post('add-day')
  async create(@Body() createHistoryDto: CreateHistoryDto) {
    try {
      const response = await this.pockerService.addDay(createHistoryDto.buyIn, createHistoryDto.payOut, createHistoryDto.dateJoin, createHistoryDto.dateLeave, createHistoryDto.location);
      return { profit: response.profit, timeSpend: response.timeSpend };
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  @Get('get-all')
  getAll() {
    return this.pockerService.getAll();
  }
}
