import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class ArkCommandLog {
  @PrimaryGeneratedColumn()
  command_id: number;

  @Column({ type: 'varchar', length: 30, nullable: false })
  username: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  command: string;

  @Column({ type: 'varchar', length: 1000, nullable: false })
  response: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
