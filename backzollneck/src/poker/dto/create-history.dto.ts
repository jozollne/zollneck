import { IsDate, Length } from 'class-validator';

export class CreateHistoryDto {
  @Length(1, 5)
  buyIn: number;

  @Length(1, 5)
  payOut: number;

  @Length(1, 5)
  profit: number;

  @Length(1, 5)
  allTimeProfit: number;

  @IsDate()
  dateJoin: Date;

  @IsDate()
  dateLeave: Date;

  @Length(1, 5)
  timeSpend: number;

  @Length(1, 10)
  allTimeTimeSpend: number;

  @Length(1, 150)
  location: string;

  @Length(1, 40)
  gamemode: string;

  @Length(1, 5)
  fun: number;
}
