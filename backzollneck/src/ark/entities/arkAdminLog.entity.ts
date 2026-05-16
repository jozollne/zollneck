import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity()
export class ArkAdminLog {
    @PrimaryGeneratedColumn()
    admin_id: number;

    @Index()
    @Column({ type: 'varchar', length: 100, nullable: true })
    player_name: string | null;

    @Index()
    @Column({ type: 'varchar', length: 100, nullable: true })
    player_id: string | null;

    @Column({ type: 'varchar', length: 500, nullable: false })
    command: string;

    @Column({ type: 'text', nullable: false })
    raw_line: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
