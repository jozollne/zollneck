import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Poker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float', nullable: false })
  buyIn: number;

  @Column({ type: 'float', nullable: false })
  payOut: number;

  @Column({ type: 'float', nullable: false })
  profit: number;

  @Column({ type: 'float', nullable: false })
  allTimeProfit: number;

  @Column({ type: 'timestamp', nullable: true })
  dateJoin: Date;

  @Column({ type: 'timestamp', nullable: true })
  dateLeave: Date;

  @Column({ type: 'float', nullable: true })
  timeSpend: number;

  @Column({ type: 'float', nullable: true })
  allTimeTimeSpend: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 40, nullable: false })
  gamemode: string;

  @Column({ type: 'smallint', nullable: false })
  fun: number;
}
