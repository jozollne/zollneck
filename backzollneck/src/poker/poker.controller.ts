import { Controller, Get, Post, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { PokerService } from './poker.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateHistoryDto } from './dto/create-history.dto';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('poker')
export class PokerController {
  constructor(private readonly pokerService: PokerService) { }

  @Post('add-day')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('poker')
  async create(@Body() createHistoryDto: CreateHistoryDto) {
    try {
      const response = await this.pokerService.addDay(createHistoryDto.buyIn, createHistoryDto.payOut, createHistoryDto.gamemode, createHistoryDto.fun, createHistoryDto.dateJoin, createHistoryDto.dateLeave, createHistoryDto.location);
      return { profit: response.profit, timeSpend: response.timeSpend };
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  @Get('get-all')
  getAll() {
    return this.pokerService.getAll();
  }
}
