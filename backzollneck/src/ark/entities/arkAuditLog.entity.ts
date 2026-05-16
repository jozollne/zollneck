import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity()
export class ArkAuditLog {
    @PrimaryGeneratedColumn()
    audit_id: number;

    @Index()
    @Column({ type: 'varchar', length: 100, nullable: false })
    username: string;

    // z.B. 'start', 'stop', 'rcon', 'config_write'
    @Index()
    @Column({ type: 'varchar', length: 50, nullable: false })
    action: string;

    // z.B. Dateiname oder Befehl, optional
    @Column({ type: 'varchar', length: 200, nullable: true })
    target: string | null;

    // Menschen-lesbares Diff/Detail (z.B. geänderte Keys, RCON-Befehl, Response)
    @Column({ type: 'text', nullable: true })
    details: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
