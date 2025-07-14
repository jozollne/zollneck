import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Poker } from './entities/history.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PokerService {
  constructor(
    @InjectRepository(Poker) private pokerRepository: Repository<Poker>,
  ) { }

  async addDay(buyIn: number, payOut: number, gamemode: string, fun: number, dateJoin: Date | string, dateLeave: Date | string, location: string): Promise<Poker> {
    if (!Number(buyIn)) {
      throw new BadRequestException('Fehler: Buy In muss eine Zahl sein.');
    }
    if (isNaN(Number(payOut))) {
      throw new BadRequestException('Fehler: Pay Out muss eine Zahl sein.');
    }
    if (!location || location.length < 3 || location.length > 150) {
      throw new BadRequestException('Fehler: Location muss zwischen 3 und 150 Zeichen lang sein.');
    }
    if (!gamemode || gamemode.length < 3 || gamemode.length > 40) {
      throw new BadRequestException('Fehler: Gamemode muss zwischen 3 und 40 Zeichen lang sein.');
    }
    if (!Number.isInteger(fun)) {
      throw new BadRequestException('Fehler: Fun muss eine ganze Zahl sein.');
    }
    if (!Number(fun) || fun < 1 || fun > 5) {
      throw new BadRequestException('Fehler: Fun muss eine Zahl zwischen 1 und 5 sein.');
    }
    if (location && location.length > 150) {
      throw new BadRequestException('Fehler: Location darf maximal 150 Zeichen lang sein.');
    }
    if (dateJoin && typeof dateJoin !== 'string' && !(dateJoin instanceof Date)) {
      throw new BadRequestException('Fehler: Date Join muss ein gültiges Datum sein.');
    }
    if (dateLeave && typeof dateLeave !== 'string' && !(dateLeave instanceof Date)) {
      throw new BadRequestException('Fehler: Date Leave muss ein gültiges Datum sein.');
    }

    const profit = payOut - buyIn;

    let joinDateObj: Date = null;
    let leaveDateObj: Date = null;
    let timeSpend: number = null;

    const hasJoin = !!dateJoin;
    const hasLeave = !!dateLeave;

    if (hasJoin !== hasLeave) {
      throw new BadRequestException('Fehler: Eintritts- und Verlassen-Datum müssen entweder beide angegeben oder beide leer sein.');
    }

    if (hasJoin && hasLeave) {
      joinDateObj = new Date(dateJoin);
      leaveDateObj = new Date(dateLeave);

      if (isNaN(joinDateObj.getTime()) || isNaN(leaveDateObj.getTime())) {
        throw new BadRequestException('Fehler: Ungültiges Datumsformat.');
      }

      timeSpend = (leaveDateObj.getTime() - joinDateObj.getTime()) / 1000;

      if (timeSpend < 0) {
        throw new BadRequestException('Fehler: Das Verlassen-Datum darf nicht vor dem Eintritts-Datum liegen.');
      }
      if (timeSpend < 1) {
        throw new BadRequestException('Fehler: Du musst mindestens 1 Sekunde gespielt haben, um einen Tag hinzuzufügen.');
      }
    }

    const { sum } = await this.pokerRepository
      .createQueryBuilder('poker')
      .select('SUM(poker.profit)', 'sum')
      .getRawOne<{ sum: string }>();


    const { sum: timeSum } = await this.pokerRepository
      .createQueryBuilder('poker')
      .select('SUM(poker.timeSpend)', 'sum')
      .where('poker.timeSpend IS NOT NULL')
      .getRawOne<{ sum: string }>();

    const allTimeTimeSpend = (timeSum ? parseFloat(timeSum) : 0) + (timeSpend ?? 0);

    const allTimeProfit = (sum ? parseFloat(sum) : 0) + profit;

    const day = this.pokerRepository.create({
      buyIn,
      payOut,
      profit,
      allTimeProfit,
      dateJoin: joinDateObj,
      dateLeave: leaveDateObj,
      timeSpend,
      allTimeTimeSpend,
      location,
      fun,
      gamemode,
    });

    return this.pokerRepository.save(day);
  }

  async getAll(): Promise<Omit<Poker, 'dateLeave'>[]> {
    const entries = await this.pokerRepository.find({
      order: { id: 'DESC' },
    });

    return entries.map(({ dateLeave, ...rest }) => rest);
  }

}
