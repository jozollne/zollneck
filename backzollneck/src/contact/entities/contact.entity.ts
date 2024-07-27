import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Contact {
  @PrimaryGeneratedColumn()
  contact_id: number;

  @Column({ type: 'varchar', length: 50 })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  subject: string;

  @Column({ type: 'varchar', length: 5000, nullable: false })
  message: string;
}
