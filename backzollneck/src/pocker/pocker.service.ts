import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Pocker } from './entities/history.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PockerService {
  constructor(
    @InjectRepository(Pocker) private pockerRepository: Repository<Pocker>,
  ) { }

  async addDay(buyIn: number, payOut: number, dateJoin: Date | string, dateLeave: Date | string, location: string): Promise<Pocker> {
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

    const { sum } = await this.pockerRepository
      .createQueryBuilder('pocker')
      .select('SUM(pocker.profit)', 'sum')
      .getRawOne<{ sum: string }>();


    const { sum: timeSum } = await this.pockerRepository
      .createQueryBuilder('pocker')
      .select('SUM(pocker.timeSpend)', 'sum')
      .where('pocker.timeSpend IS NOT NULL')
      .getRawOne<{ sum: string }>();

    const allTimeTimeSpend = (timeSum ? parseFloat(timeSum) : 0) + (timeSpend ?? 0);

    const allTimeProfit = (sum ? parseFloat(sum) : 0) + profit;

    const day = this.pockerRepository.create({
      buyIn,
      payOut,
      profit,
      allTimeProfit,
      dateJoin: joinDateObj,
      dateLeave: leaveDateObj,
      timeSpend,
      allTimeTimeSpend,
      location,
    });

    return this.pockerRepository.save(day);
  }

  async getAll(): Promise<Omit<Pocker, 'dateLeave'>[]> {
    const entries = await this.pockerRepository.find({
      order: { id: 'DESC' },
    });

    return entries.map(({ dateLeave, ...rest }) => rest);
  }

}
