import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Users {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  password: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lastName: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  username: string;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'varchar', length: 20 })
  role: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profileImage: string;

  @Column({ type: 'date', nullable: true })
  birthdate: Date;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  street: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  houseNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  lastPasswordChange: Date;
}
